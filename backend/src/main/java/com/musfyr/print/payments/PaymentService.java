package com.musfyr.print.payments;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.commerce.ShopProperties;
import com.musfyr.print.commerce.Tokens;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.design.DesignService;
import com.musfyr.print.notify.Emails;
import com.musfyr.print.notify.Notifier;

/**
 * Payment lifecycle with Przelewy24. An order is marked paid ONLY after a correctly signed notification and a
 * successful server-to-server verify call – never because the customer's browser came back to the shop.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final P24Client p24;
    private final P24Signer signer;
    private final P24Properties props;
    private final ShopProperties shop;
    private final DesignService designs;
    private final Notifier notifier;
    private final Emails emails;

    public PaymentService(JdbcClient jdbc, JsonMapper json, P24Client p24, P24Signer signer, P24Properties props,
                          ShopProperties shop, DesignService designs, Notifier notifier, Emails emails) {
        this.jdbc = jdbc;
        this.json = json;
        this.p24 = p24;
        this.signer = signer;
        this.props = props;
        this.shop = shop;
        this.designs = designs;
        this.notifier = notifier;
        this.emails = emails;
    }

    public record Redirect(String url) {
    }

    /**
     * Opens a new payment session for an unpaid order and returns the provider's payment page.
     * {@code accessToken} (guest link) is appended to the return URL when known; account owners return without it.
     */
    public Redirect start(UUID orderId, String accessToken) {
        if (!props.enabled()) {
            throw new BusinessRuleException("Online payments are not available yet. Please contact us to complete your order.");
        }
        record O(String number, String status, String email, long total, String currency, String locale, String name) {
        }
        O o = jdbc.sql("SELECT number, status, email, total_minor, currency, locale, shipping_address ->> 'fullName' AS name FROM orders WHERE id = :id")
                .param("id", orderId)
                .query((rs, i) -> new O(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4), rs.getString(5), rs.getString(6), rs.getString(7)))
                .single();
        if (!List.of("PENDING_PAYMENT", "PAYMENT_FAILED").contains(o.status())) {
            throw new BusinessRuleException("This order does not need payment");
        }
        UUID paymentId = UUID.randomUUID();
        String sessionId = o.number() + "-" + Tokens.random(6);
        jdbc.sql("INSERT INTO payments (id, order_id, provider, session_id, amount_minor, currency, status) VALUES (:id, :o, 'P24', :s, :a, :c, 'CREATED')")
                .param("id", paymentId).param("o", orderId).param("s", sessionId).param("a", o.total()).param("c", o.currency()).update();
        String lang = "pl".equals(o.locale()) ? "pl" : "en";
        String urlReturn = shop.publicSiteUrl() + "/" + lang + "/checkout/complete?order=" + o.number()
                + (accessToken == null ? "" : "&t=" + accessToken);
        try {
            P24Client.Registration reg = p24.register(sessionId, o.total(), o.currency(), "Musfir Print " + o.number(), o.email(),
                    o.name(), lang, urlReturn);
            jdbc.sql("UPDATE payments SET status = 'PENDING', provider_token = :t, updated_at = now() WHERE id = :id")
                    .param("t", reg.token()).param("id", paymentId).update();
            event(paymentId, "REGISTERED", true, null, null);
            if ("PAYMENT_FAILED".equals(o.status())) {
                jdbc.sql("UPDATE orders SET status = 'PENDING_PAYMENT', updated_at = now() WHERE id = :id").param("id", orderId).update();
            }
            return new Redirect(reg.redirectUrl());
        } catch (PaymentProviderException e) {
            jdbc.sql("UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = :id").param("id", paymentId).update();
            event(paymentId, "REGISTER_FAILED", false, e.getMessage(), null);
            throw new BusinessRuleException("The payment service is not responding. Your order is saved – please try paying again in a moment.");
        }
    }

    public enum NotificationResult { OK, IGNORED_DUPLICATE, REJECTED, NOT_FOUND, VERIFY_FAILED }

    @Transactional
    public NotificationResult handleNotification(P24Notification n, String remoteIp) {
        if (!props.notificationIps().isEmpty() && !props.notificationIps().contains(remoteIp)) {
            event(null, "NOTIFICATION_REJECTED_IP", false, "From " + remoteIp, n);
            return NotificationResult.REJECTED;
        }
        if (!P24Signer.matches(signer.notificationSign(n, props.crcKey()), n.sign())
                || n.merchantId() != props.merchantId() || n.posId() != props.effectivePosId()) {
            event(null, "NOTIFICATION_BAD_SIGNATURE", false, "session " + n.sessionId(), n);
            return NotificationResult.REJECTED;
        }
        record P(UUID id, UUID orderId, String status, long amount, String currency) {
        }
        P p = jdbc.sql("SELECT id, order_id, status, amount_minor, currency FROM payments WHERE session_id = :s FOR UPDATE")
                .param("s", n.sessionId())
                .query((rs, i) -> new P(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getLong(4), rs.getString(5)))
                .optional().orElse(null);
        if (p == null) {
            event(null, "NOTIFICATION_UNKNOWN_SESSION", false, n.sessionId(), n);
            return NotificationResult.NOT_FOUND;
        }
        if (List.of("PAID", "REFUND_PENDING", "REFUNDED").contains(p.status())) {
            event(p.id(), "NOTIFICATION_DUPLICATE", true, null, n);
            return NotificationResult.IGNORED_DUPLICATE;
        }
        if (n.amount() != p.amount() || !p.currency().equals(n.currency())) {
            event(p.id(), "NOTIFICATION_AMOUNT_MISMATCH", false, n.amount() + " " + n.currency(), n);
            return NotificationResult.REJECTED;
        }
        boolean verified = p24.verify(n.sessionId(), n.orderId(), n.amount(), n.currency());
        if (!verified) {
            jdbc.sql("UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = :id").param("id", p.id()).update();
            jdbc.sql("UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = now() WHERE id = :id AND status = 'PENDING_PAYMENT'")
                    .param("id", p.orderId()).update();
            orderEvent(p.orderId(), "PAYMENT_FAILED", "Przelewy24 verification failed");
            event(p.id(), "VERIFY_FAILED", false, null, n);
            return NotificationResult.VERIFY_FAILED;
        }
        jdbc.sql("UPDATE payments SET status = 'PAID', provider_order_id = :po, method_id = :m, updated_at = now() WHERE id = :id")
                .param("po", n.orderId()).param("m", n.methodId()).param("id", p.id()).update();
        markOrderPaid(p.orderId());
        event(p.id(), "VERIFIED", true, "P24 order " + n.orderId(), n);
        return NotificationResult.OK;
    }

    private void markOrderPaid(UUID orderId) {
        int changed = jdbc.sql("""
                UPDATE orders SET status = 'PAID', paid_at = now(), updated_at = now(), version = version + 1
                WHERE id = :id AND status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED')""")
                .param("id", orderId).update();
        if (changed == 0) {
            return;
        }
        orderEvent(orderId, "PAID", "Payment confirmed by Przelewy24");
        // Stock is committed only for paid orders.
        jdbc.sql("""
                UPDATE product_variants v SET stock_quantity = GREATEST(v.stock_quantity - oi.qty, 0), updated_at = now()
                FROM (SELECT variant_id, SUM(quantity) AS qty FROM order_items WHERE order_id = :o GROUP BY variant_id) oi
                WHERE v.id = oi.variant_id AND v.track_inventory""").param("o", orderId).update();
        jdbc.sql("UPDATE promotions SET redemptions = redemptions + 1 WHERE code = (SELECT promotion_code FROM orders WHERE id = :o)")
                .param("o", orderId).update();
        jdbc.sql("UPDATE carts SET status = 'CONVERTED', updated_at = now() WHERE id = (SELECT cart_id FROM orders WHERE id = :o)")
                .param("o", orderId).update();
        List<UUID> designIds = jdbc.sql("SELECT DISTINCT design_id FROM order_items WHERE order_id = :o AND design_id IS NOT NULL")
                .param("o", orderId).query(UUID.class).list();
        designs.markOrdered(designIds);
        afterCommit(() -> sendConfirmation(orderId));
    }

    private void sendConfirmation(UUID orderId) {
        try {
            record O(String number, String email, String locale, long total, String currency, boolean guest) {
            }
            O o = jdbc.sql("SELECT number, email, locale, total_minor, currency, user_id IS NULL FROM orders WHERE id = :id").param("id", orderId)
                    .query((rs, i) -> new O(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4), rs.getString(5), rs.getBoolean(6))).single();
            List<String> lines = jdbc.sql("SELECT quantity || ' × ' || product_name || ' (' || size_code || ')' FROM order_items WHERE order_id = :id")
                    .param("id", orderId).query(String.class).list();
            String total = String.format("%d,%02d %s", o.total() / 100, o.total() % 100, o.currency());
            String link;
            if (o.guest()) {
                // Guests have no account: give them their own secret order link (only its hash is stored).
                String token = com.musfyr.print.commerce.Tokens.random(24);
                jdbc.sql("UPDATE orders SET email_token_hash = :h WHERE id = :id").param("h", com.musfyr.print.commerce.Tokens.hash(token))
                        .param("id", orderId).update();
                link = shop.publicSiteUrl() + "/" + o.locale() + "/orders/" + o.number() + "?t=" + token;
            } else {
                link = shop.publicSiteUrl() + "/" + o.locale() + "/account/orders/" + o.number();
            }
            notifier.send(emails.orderConfirmed(o.email(), o.locale(), o.number(), total, lines, link));
        } catch (Exception e) {
            log.error("Could not send order confirmation for {}", orderId, e);
        }
    }

    /** Asks Przelewy24 to refund a paid order in full. Completion is confirmed by staff from the P24 panel. */
    @Transactional
    public void refund(String orderNumber, String reason) {
        record P(UUID id, UUID orderId, String session, long providerOrder, long amount) {
        }
        P p = jdbc.sql("""
                SELECT p.id, p.order_id, p.session_id, p.provider_order_id, p.amount_minor FROM payments p JOIN orders o ON o.id = p.order_id
                WHERE o.number = :n AND p.status = 'PAID' FOR UPDATE""")
                .param("n", orderNumber)
                .query((rs, i) -> new P(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getLong(4), rs.getLong(5)))
                .optional().orElseThrow(() -> new BusinessRuleException("Only paid orders can be refunded"));
        boolean accepted;
        try {
            accepted = p24.refund(UUID.randomUUID().toString(), UUID.randomUUID().toString(), p.providerOrder(), p.session(), p.amount(),
                    reason == null || reason.isBlank() ? "Refund " + orderNumber : reason);
        } catch (PaymentProviderException e) {
            event(p.id(), "REFUND_FAILED", false, e.getMessage(), null);
            throw new BusinessRuleException("Przelewy24 did not accept the refund request. Try again or refund in the P24 panel.");
        }
        if (!accepted) {
            event(p.id(), "REFUND_REJECTED", false, null, null);
            throw new BusinessRuleException("Przelewy24 rejected the refund request.");
        }
        jdbc.sql("UPDATE payments SET status = 'REFUND_PENDING', updated_at = now() WHERE id = :id").param("id", p.id()).update();
        jdbc.sql("UPDATE orders SET status = 'REFUND_PENDING', updated_at = now() WHERE id = :id").param("id", p.orderId()).update();
        orderEvent(p.orderId(), "REFUND_PENDING", reason);
        event(p.id(), "REFUND_REQUESTED", true, reason, null);
    }

    /** Staff confirm that the refund has been completed (visible in the Przelewy24 panel). */
    @Transactional
    public void confirmRefund(String orderNumber) {
        UUID orderId = jdbc.sql("SELECT id FROM orders WHERE number = :n AND status = 'REFUND_PENDING'").param("n", orderNumber)
                .query(UUID.class).optional().orElseThrow(() -> new NotFoundException("Order awaiting refund", orderNumber));
        jdbc.sql("UPDATE payments SET status = 'REFUNDED', updated_at = now() WHERE order_id = :o AND status = 'REFUND_PENDING'").param("o", orderId).update();
        jdbc.sql("UPDATE orders SET status = 'REFUNDED', updated_at = now() WHERE id = :o").param("o", orderId).update();
        orderEvent(orderId, "REFUNDED", null);
    }

    void orderEvent(UUID orderId, String status, String note) {
        jdbc.sql("INSERT INTO order_events (order_id, status, note) VALUES (:o, :s, :n)")
                .param("o", orderId).param("s", status).param("n", note).update();
    }

    private void event(UUID paymentId, String type, boolean ok, String detail, Object payload) {
        jdbc.sql("INSERT INTO payment_events (payment_id, type, success, detail, payload) VALUES (:p, :t, :ok, :d, CAST(:pl AS jsonb))")
                .param("p", paymentId).param("t", type).param("ok", ok).param("d", detail == null ? null : detail.substring(0, Math.min(500, detail.length())))
                .param("pl", payload == null ? null : json.writeValueAsString(redact(payload))).update();
    }

    private Object redact(Object payload) {
        if (payload instanceof P24Notification n) {
            return Map.of("sessionId", n.sessionId(), "amount", n.amount(), "currency", n.currency(), "orderId", n.orderId(), "methodId", n.methodId());
        }
        return payload;
    }

    private static void afterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    r.run();
                }
            });
        } else {
            r.run();
        }
    }
}
