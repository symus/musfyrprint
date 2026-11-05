package com.musfyr.print.commerce;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;
import com.musfyr.print.payments.P24Properties;
import com.musfyr.print.payments.PaymentService;

/**
 * Turns the cart into an order. Everything is re-priced and re-validated on the server; the order stores an exact
 * snapshot (prices, options, design documents) so later catalogue or design changes never alter it.
 */
@Service
public class CheckoutService {

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final CartService carts;
    private final CommerceRepository repo;
    private final PaymentService payments;
    private final P24Properties p24;
    private final TransactionTemplate tx;
    private final RateLimiter rateLimiter;

    public CheckoutService(JdbcClient jdbc, JsonMapper json, CartService carts, CommerceRepository repo, PaymentService payments,
                           P24Properties p24, TransactionTemplate tx, RateLimiter rateLimiter) {
        this.jdbc = jdbc;
        this.json = json;
        this.carts = carts;
        this.repo = repo;
        this.payments = payments;
        this.p24 = p24;
        this.tx = tx;
        this.rateLimiter = rateLimiter;
    }

    public record Address(@NotBlank @Size(max = 120) String fullName, @Size(max = 160) String company,
                          @NotBlank @Size(max = 200) String line1, @Size(max = 200) String line2,
                          @NotBlank @Pattern(regexp = "^\\d{2}-\\d{3}$", message = "Use the Polish format 00-000") String postalCode,
                          @NotBlank @Size(max = 120) String city,
                          @NotBlank @Pattern(regexp = "^PL$", message = "We currently ship within Poland") String country,
                          @NotBlank @Pattern(regexp = "^\\+?[0-9 ()-]{9,20}$") String phone) {
    }

    public record CheckoutRequest(@NotBlank @Email @Size(max = 255) String email,
                                  @jakarta.validation.Valid @jakarta.validation.constraints.NotNull Address shippingAddress,
                                  @NotBlank @Size(max = 40) String shippingMethod,
                                  @Pattern(regexp = "^[A-Z]{3}[0-9]{2,3}[A-Z]{0,3}$", message = "Enter a locker code such as KRA01M") String pickupPoint,
                                  @Size(max = 40) String promotionCode,
                                  boolean acceptTerms,
                                  @Size(max = 500) String customerNote,
                                  @Pattern(regexp = "^(pl|en)$") String locale) {

        @AssertTrue(message = "Please accept the terms of sale")
        public boolean isTermsAccepted() {
            return acceptTerms;
        }
    }

    public record CheckoutResult(String orderNumber, String accessToken, String redirectUrl) {
    }

    public CheckoutResult checkout(UUID cartId, UUID userId, CheckoutRequest req, String idempotencyKey) {
        if (idempotencyKey != null) {
            String previous = jdbc.sql("SELECT response::text FROM checkout_requests WHERE idempotency_key = :k").param("k", idempotencyKey)
                    .query(String.class).optional().orElse(null);
            if (previous != null) {
                return json.readValue(previous, CheckoutResult.class);
            }
        }
        rateLimiter.check("checkout", RequestContext.clientIp(), 30, Duration.ofHours(1));
        if (!p24.enabled()) {
            throw new BusinessRuleException("Online payments are not available yet. Please contact us to complete your order.");
        }
        String lang = req.locale() == null ? "pl" : req.locale();
        CartService.Priced priced = carts.price(cartId, req.shippingMethod(), req.promotionCode(), lang);
        CartService.CartView cart = priced.view();
        if (cart.lines().isEmpty()) {
            throw new BusinessRuleException("Your cart is empty");
        }
        CommerceRepository.ShippingMethod method = cart.shippingMethods().stream()
                .filter(m -> m.code().equals(req.shippingMethod())).findFirst()
                .orElseThrow(() -> new BusinessRuleException("Please choose a delivery method"));
        if (method.requiresPickupPoint() && (req.pickupPoint() == null || req.pickupPoint().isBlank())) {
            throw new BusinessRuleException("Please enter the Paczkomat code for delivery");
        }
        if (req.promotionCode() != null && !req.promotionCode().isBlank() && cart.promotionError() != null) {
            throw new BusinessRuleException("The discount code can't be used: " + cart.promotionError());
        }
        for (CartService.CartLine l : cart.lines()) {
            if (!l.available()) {
                throw new BusinessRuleException(l.productName() + " is no longer available");
            }
            if (l.stockShortfall() > 0) {
                throw new BusinessRuleException("Only limited stock is left for " + l.productName() + " (" + l.sizeCode() + ")");
            }
            if (!l.designErrors().isEmpty()) {
                throw new BusinessRuleException("The design for " + l.productName() + " needs attention before printing");
            }
        }
        for (CartService.RawLine r : priced.raw()) {
            repo.optionsSurcharge(r.variant().productId(), r.options()); // options still valid
        }

        String accessToken = Tokens.random(24);
        UUID orderId = UUID.randomUUID();
        PriceCalculator.Quote q = priced.quote();
        String number = tx.execute(status -> {
            long seq = jdbc.sql("SELECT nextval('order_number_seq')").query(Long.class).single();
            String n = "MP-" + seq;
            jdbc.sql("""
                    INSERT INTO orders (id, number, user_id, cart_id, email, status, currency, subtotal_minor, discount_minor,
                                        shipping_minor, tax_minor, total_minor, tax_mode, promotion_code, shipping_method_code,
                                        pickup_point, shipping_address, locale, access_token_hash, terms_accepted_at, customer_note)
                    VALUES (:id, :n, :u, :cart, :email, 'PENDING_PAYMENT', 'PLN', :sub, :disc, :ship, :tax, :total, :taxMode, :promo,
                            :method, :pickup, CAST(:address AS jsonb), :locale, :hash, now(), :note)""")
                    .param("id", orderId).param("n", n).param("u", userId).param("cart", cartId)
                    .param("email", req.email().trim().toLowerCase()).param("sub", q.subtotalMinor()).param("disc", q.discountMinor())
                    .param("ship", q.shippingMinor()).param("tax", q.taxIncludedMinor()).param("total", q.totalMinor())
                    .param("taxMode", q.taxMode()).param("promo", q.promotionCode()).param("method", method.code())
                    .param("pickup", method.requiresPickupPoint() ? req.pickupPoint() : null)
                    .param("address", json.writeValueAsString(req.shippingAddress())).param("locale", lang)
                    .param("hash", Tokens.hash(accessToken)).param("note", req.customerNote()).update();
            for (int i = 0; i < priced.raw().size(); i++) {
                CartService.RawLine r = priced.raw().get(i);
                PriceCalculator.Line pl = q.lines().get(i);
                JsonNode snapshot = r.design() == null ? null : r.design().document();
                jdbc.sql("""
                        INSERT INTO order_items (id, order_id, product_id, variant_id, sku, product_name, color_code, size_code, quantity,
                                                 unit_price_minor, line_total_minor, options, price_breakdown, design_id, design_snapshot, print_zones)
                        VALUES (:id, :o, :p, :v, :sku, :name, :color, :size, :q, :unit, :total, CAST(:opts AS jsonb),
                                CAST(:breakdown AS jsonb), :d, CAST(:snap AS jsonb), :zones)""")
                        .param("id", UUID.randomUUID()).param("o", orderId).param("p", r.variant().productId())
                        .param("v", r.variant().variantId()).param("sku", r.variant().sku()).param("name", r.variant().productName())
                        .param("color", r.variant().colorCode()).param("size", r.variant().sizeCode()).param("q", r.quantity())
                        .param("unit", pl.unitPriceMinor()).param("total", pl.totalMinor())
                        .param("opts", json.writeValueAsString(r.options()))
                        .param("breakdown", json.writeValueAsString(Map.of("unit", pl.unitBreakdown(), "volumePercent", pl.volumePercent(),
                                "volumeDiscountMinor", pl.volumeDiscountMinor())))
                        .param("d", r.designId()).param("snap", snapshot == null ? null : json.writeValueAsString(snapshot))
                        .param("zones", r.zones().toArray(String[]::new)).update();
            }
            jdbc.sql("INSERT INTO order_events (order_id, status, note) VALUES (:o, 'PENDING_PAYMENT', 'Order placed')").param("o", orderId).update();
            return n;
        });

        PaymentService.Redirect redirect = payments.start(orderId, accessToken);
        CheckoutResult result = new CheckoutResult(number, accessToken, redirect.url());
        if (idempotencyKey != null) {
            jdbc.sql("INSERT INTO checkout_requests (idempotency_key, order_id, response) VALUES (:k, :o, CAST(:r AS jsonb)) ON CONFLICT DO NOTHING")
                    .param("k", idempotencyKey).param("o", orderId).param("r", json.writeValueAsString(result)).update();
        }
        return result;
    }

    /** Retry payment for an unpaid order (guest token or account owner). */
    public PaymentService.Redirect retryPayment(String number, String token, UUID userId) {
        record O(UUID id, String hash, UUID user) {
        }
        O o = jdbc.sql("SELECT id, access_token_hash, user_id FROM orders WHERE number = :n").param("n", number)
                .query((rs, i) -> new O(rs.getObject(1, UUID.class), rs.getString(2), rs.getObject(3, UUID.class)))
                .optional().orElseThrow(() -> new com.musfyr.print.common.error.NotFoundException("Order", number));
        boolean byToken = Tokens.matchesHash(o.hash(), token);
        boolean byAccount = userId != null && userId.equals(o.user());
        if (!byToken && !byAccount) {
            throw new com.musfyr.print.common.error.NotFoundException("Order", number);
        }
        return payments.start(o.id(), byToken ? token : null);
    }
}
