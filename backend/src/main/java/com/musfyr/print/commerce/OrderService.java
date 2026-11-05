package com.musfyr.print.commerce;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.web.Money;
import com.musfyr.print.common.web.PageResponse;

/** Order read models for customers (account or guest link) and staff. */
@Service
@Transactional(readOnly = true)
public class OrderService {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public OrderService(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record OrderItem(String productName, String sku, String colorCode, String sizeCode, int quantity, Money unitPrice,
                            Money lineTotal, Map<String, Object> options, List<String> printZones, UUID designId) {
    }

    public record OrderEvent(String status, String note, Instant at) {
    }

    public record OrderView(String number, String status, String email, Instant createdAt, Instant paidAt, Money subtotal,
                            Money discount, Money shipping, Money total, String taxMode, Money taxIncluded, String promotionCode,
                            String shippingMethod, String pickupPoint, JsonNode shippingAddress, List<OrderItem> items,
                            List<OrderEvent> events, boolean canPay, String paymentStatus) {
    }

    public record OrderSummary(String number, String status, String email, Money total, int itemCount, Instant createdAt) {
    }

    record Head(UUID id, String number, String status, String email, String currency, long subtotal, long discount, long shipping,
                long tax, long total, String taxMode, String promo, String shipMethod, String pickup, String address,
                Instant created, Instant paid, String accessHash, String emailHash, UUID userId) {
    }

    Head head(String number) {
        return jdbc.sql("""
                SELECT id, number, status, email, currency, subtotal_minor, discount_minor, shipping_minor, tax_minor, total_minor,
                       tax_mode, promotion_code, shipping_method_code, pickup_point, shipping_address::text AS address,
                       created_at, paid_at, access_token_hash, email_token_hash, user_id
                FROM orders WHERE number = :n""")
                .param("n", number)
                .query((rs, i) -> new Head(rs.getObject("id", UUID.class), rs.getString("number"), rs.getString("status"),
                        rs.getString("email"), rs.getString("currency"), rs.getLong("subtotal_minor"), rs.getLong("discount_minor"),
                        rs.getLong("shipping_minor"), rs.getLong("tax_minor"), rs.getLong("total_minor"), rs.getString("tax_mode"),
                        rs.getString("promotion_code"), rs.getString("shipping_method_code"), rs.getString("pickup_point"),
                        rs.getString("address"), rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("paid_at") == null ? null : rs.getTimestamp("paid_at").toInstant(),
                        rs.getString("access_token_hash"), rs.getString("email_token_hash"), rs.getObject("user_id", UUID.class)))
                .optional().orElseThrow(() -> new NotFoundException("Order", number));
    }

    /** Guest access with the secret link token; also works for the account owner. */
    public OrderView forGuest(String number, String token) {
        Head h = head(number);
        if (!Tokens.matchesHash(h.accessHash(), token) && !Tokens.matchesHash(h.emailHash(), token)) {
            throw new NotFoundException("Order", number);
        }
        return view(h);
    }

    public OrderView forCustomer(String number, UUID userId) {
        Head h = head(number);
        if (!userId.equals(h.userId())) {
            throw new NotFoundException("Order", number);
        }
        return view(h);
    }

    public List<OrderSummary> customerOrders(UUID userId) {
        return jdbc.sql("""
                SELECT o.number, o.status, o.email, o.total_minor, o.currency, o.created_at,
                       (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS items
                FROM orders o WHERE o.user_id = :u ORDER BY o.created_at DESC LIMIT 100""")
                .param("u", userId).query(this::summary).list();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT', 'PRODUCTION')")
    public PageResponse<OrderSummary> adminList(String status, String q, int page, int size) {
        String where = " WHERE (:status IS NULL OR o.status = :status) AND (:q IS NULL OR o.number ILIKE :like OR o.email ILIKE :like)";
        String like = q == null || q.isBlank() ? null : "%" + q.trim() + "%";
        long total = jdbc.sql("SELECT count(*) FROM orders o" + where).param("status", status).param("q", like).param("like", like)
                .query(Long.class).single();
        List<OrderSummary> items = jdbc.sql("""
                SELECT o.number, o.status, o.email, o.total_minor, o.currency, o.created_at,
                       (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS items
                FROM orders o""" + where + " ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset")
                .param("status", status).param("q", like).param("like", like).param("limit", size).param("offset", (long) page * size)
                .query(this::summary).list();
        return PageResponse.of(items, page, size, total);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT', 'PRODUCTION')")
    public OrderView adminView(String number) {
        return view(head(number));
    }

    public record PaymentEvent(String type, boolean success, String detail, Instant at) {
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public List<PaymentEvent> paymentEvents(String number) {
        return jdbc.sql("""
                SELECT e.type, e.success, e.detail, e.created_at FROM payment_events e JOIN payments p ON p.id = e.payment_id
                JOIN orders o ON o.id = p.order_id WHERE o.number = :n ORDER BY e.created_at""")
                .param("n", number)
                .query((rs, i) -> new PaymentEvent(rs.getString(1), rs.getBoolean(2), rs.getString(3), rs.getTimestamp(4).toInstant()))
                .list();
    }

    private OrderSummary summary(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new OrderSummary(rs.getString("number"), rs.getString("status"), rs.getString("email"),
                new Money(rs.getLong("total_minor"), rs.getString("currency")), rs.getInt("items"), rs.getTimestamp("created_at").toInstant());
    }

    private OrderView view(Head h) {
        List<OrderItem> items = jdbc.sql("""
                SELECT product_name, sku, color_code, size_code, quantity, unit_price_minor, line_total_minor, options::text AS options,
                       print_zones, design_id FROM order_items WHERE order_id = :o ORDER BY product_name""")
                .param("o", h.id())
                .query((rs, i) -> new OrderItem(rs.getString("product_name"), rs.getString("sku"), rs.getString("color_code"),
                        rs.getString("size_code"), rs.getInt("quantity"), new Money(rs.getLong("unit_price_minor"), h.currency()),
                        new Money(rs.getLong("line_total_minor"), h.currency()),
                        json.readValue(rs.getString("options"), new tools.jackson.core.type.TypeReference<Map<String, Object>>() {
                        }),
                        List.of((String[]) rs.getArray("print_zones").getArray()), rs.getObject("design_id", UUID.class)))
                .list();
        List<OrderEvent> events = jdbc.sql("SELECT status, note, created_at FROM order_events WHERE order_id = :o ORDER BY created_at, id")
                .param("o", h.id())
                .query((rs, i) -> new OrderEvent(rs.getString(1), rs.getString(2), rs.getTimestamp(3).toInstant())).list();
        String paymentStatus = jdbc.sql("SELECT status FROM payments WHERE order_id = :o ORDER BY created_at DESC LIMIT 1")
                .param("o", h.id()).query(String.class).optional().orElse(null);
        boolean canPay = "PENDING_PAYMENT".equals(h.status()) || "PAYMENT_FAILED".equals(h.status());
        return new OrderView(h.number(), h.status(), h.email(), h.created(), h.paid(), m(h.subtotal(), h), m(h.discount(), h),
                m(h.shipping(), h), m(h.total(), h), h.taxMode(), m(h.tax(), h), h.promo(), h.shipMethod(), h.pickup(),
                json.readTree(h.address()), items, events, canPay, paymentStatus);
    }

    private static Money m(long minor, Head h) {
        return new Money(minor, h.currency());
    }
}
