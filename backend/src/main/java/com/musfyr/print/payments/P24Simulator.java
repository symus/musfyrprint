package com.musfyr.print.payments;

import java.net.URI;
import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.JsonNode;

/**
 * Built-in stand-in for the Przelewy24 sandbox, enabled only with app.payments.p24.mode=SIMULATOR (dev, demo,
 * tests). It implements the same endpoints and signatures, so the real client and notification handling are
 * exercised end to end. The payment page is clearly marked as a test – no money moves.
 */
@RestController
@RequestMapping(P24Simulator.PATH)
@ConditionalOnProperty(prefix = "app.payments.p24", name = "mode", havingValue = "SIMULATOR")
public class P24Simulator {

    public static final String PATH = "/dev/p24-simulator";
    private static final Logger log = LoggerFactory.getLogger(P24Simulator.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final P24Properties props;
    private final P24Signer signer;
    private final RestClient http;
    private final Map<String, Tx> byToken = new ConcurrentHashMap<>();
    private final Map<String, Tx> bySession = new ConcurrentHashMap<>();

    record Tx(String token, String sessionId, long amount, String currency, String description, String email,
              String urlReturn, String urlStatus, String language, long[] orderId) {
    }

    public P24Simulator(P24Properties props, P24Signer signer, RestClient.Builder builder) {
        this.props = props;
        this.signer = signer;
        this.http = builder.build();
    }

    private boolean authorised(HttpServletRequest req) {
        String expected = "Basic " + java.util.Base64.getEncoder().encodeToString(
                (props.effectivePosId() + ":" + props.apiKey()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return P24Signer.matches(expected, req.getHeader(HttpHeaders.AUTHORIZATION));
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message, "code", status.value()));
    }

    @GetMapping("/api/v1/testAccess")
    ResponseEntity<Map<String, Object>> testAccess(HttpServletRequest req) {
        return authorised(req) ? ResponseEntity.ok(Map.of("data", true, "error", "")) : error(HttpStatus.UNAUTHORIZED, "Incorrect authentication");
    }

    @PostMapping("/api/v1/transaction/register")
    ResponseEntity<Map<String, Object>> register(HttpServletRequest req, @RequestBody JsonNode body) {
        if (!authorised(req)) {
            return error(HttpStatus.UNAUTHORIZED, "Incorrect authentication");
        }
        String sessionId = body.path("sessionId").asString("");
        long amount = body.path("amount").asLong();
        String currency = body.path("currency").asString("");
        String expected = signer.registerSign(sessionId, props.merchantId(), amount, currency, props.crcKey());
        if (!P24Signer.matches(expected, body.path("sign").asString(""))) {
            return error(HttpStatus.BAD_REQUEST, "Incorrect CRC value");
        }
        String token = UUID.randomUUID().toString().replace("-", "").toUpperCase();
        Tx tx = new Tx(token, sessionId, amount, currency, body.path("description").asString(""), body.path("email").asString(""),
                body.path("urlReturn").asString(""), body.path("urlStatus").asString(""), body.path("language").asString("pl"), new long[1]);
        byToken.put(token, tx);
        bySession.put(sessionId, tx);
        return ResponseEntity.ok(Map.of("data", Map.of("token", token), "responseCode", 0));
    }

    @GetMapping(value = "/trnRequest/{token}", produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> page(@PathVariable String token) {
        Tx tx = byToken.get(token);
        if (tx == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("<p>Unknown transaction</p>");
        }
        boolean pl = "pl".equals(tx.language());
        String amount = String.format("%d,%02d %s", tx.amount() / 100, tx.amount() % 100, tx.currency());
        String html = """
                <!doctype html><html lang="%s"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>%s</title><style>
                body{font-family:system-ui,sans-serif;background:#f4eee4;color:#17142b;margin:0;padding:24px}
                main{max-width:440px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 24px -12px #17142b55}
                .test{background:#ffc23c;font-weight:700;padding:10px 12px;border-radius:10px;margin-bottom:18px}
                h1{font-size:22px;margin:0 0 6px} .amt{font-size:32px;font-weight:800;margin:14px 0}
                button{display:block;width:100%%;padding:14px;border-radius:999px;font-size:16px;font-weight:700;cursor:pointer;margin-top:10px}
                .pay{background:#17142b;color:#fff;border:0} .decline{background:#fff;border:2px solid #17142b}
                small{color:#4a4560}</style></head><body><main>
                <div class="test">%s</div><h1>%s</h1><div>%s</div><div class="amt">%s</div><small>%s</small>
                <form method="post" action="%s/trnRequest/%s/pay"><button class="pay" type="submit">%s</button></form>
                <form method="post" action="%s/trnRequest/%s/decline"><button class="decline" type="submit">%s</button></form>
                </main></body></html>""".formatted(
                pl ? "pl" : "en",
                pl ? "Płatność testowa" : "Test payment",
                pl ? "TRYB TESTOWY – symulator Przelewy24, żadne pieniądze nie zostaną pobrane." : "TEST MODE – Przelewy24 simulator, no money will be taken.",
                pl ? "Płatność testowa" : "Test payment",
                HtmlUtils.htmlEscape(tx.description()), amount, HtmlUtils.htmlEscape(tx.email()),
                PATH, token, pl ? "Zapłać (test, np. BLIK)" : "Pay (test, e.g. BLIK)",
                PATH, token, pl ? "Odrzuć płatność" : "Decline payment");
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    @PostMapping("/trnRequest/{token}/pay")
    ResponseEntity<Void> pay(@PathVariable String token) {
        Tx tx = byToken.get(token);
        if (tx == null) {
            return ResponseEntity.notFound().build();
        }
        tx.orderId()[0] = 300_000_000L + RANDOM.nextInt(100_000_000);
        P24Notification unsigned = new P24Notification(props.merchantId(), props.effectivePosId(), tx.sessionId(), tx.amount(),
                tx.amount(), tx.currency(), tx.orderId()[0], 154, "p24-SIM-" + tx.orderId()[0], null);
        P24Notification signed = new P24Notification(unsigned.merchantId(), unsigned.posId(), unsigned.sessionId(), unsigned.amount(),
                unsigned.originAmount(), unsigned.currency(), unsigned.orderId(), unsigned.methodId(), unsigned.statement(),
                signer.notificationSign(unsigned, props.crcKey()));
        try {
            http.post().uri(tx.urlStatus()).contentType(MediaType.APPLICATION_JSON).body(signed).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("Simulator could not deliver the notification: {}", e.getMessage());
        }
        return ResponseEntity.status(HttpStatus.SEE_OTHER).location(URI.create(tx.urlReturn())).build();
    }

    @PostMapping("/trnRequest/{token}/decline")
    ResponseEntity<Void> decline(@PathVariable String token) {
        Tx tx = byToken.get(token);
        return tx == null ? ResponseEntity.notFound().build()
                : ResponseEntity.status(HttpStatus.SEE_OTHER).location(URI.create(tx.urlReturn())).build();
    }

    @PutMapping("/api/v1/transaction/verify")
    ResponseEntity<Map<String, Object>> verify(HttpServletRequest req, @RequestBody JsonNode body) {
        if (!authorised(req)) {
            return error(HttpStatus.UNAUTHORIZED, "Incorrect authentication");
        }
        String sessionId = body.path("sessionId").asString("");
        Tx tx = bySession.get(sessionId);
        long orderId = body.path("orderId").asLong();
        long amount = body.path("amount").asLong();
        String currency = body.path("currency").asString("");
        String expected = signer.verifySign(sessionId, orderId, amount, currency, props.crcKey());
        if (tx == null || tx.orderId()[0] != orderId || tx.amount() != amount || !P24Signer.matches(expected, body.path("sign").asString(""))) {
            return error(HttpStatus.BAD_REQUEST, "Incorrect transaction data");
        }
        return ResponseEntity.ok(Map.of("data", Map.of("status", "success"), "responseCode", 0));
    }

    @PostMapping("/api/v1/transaction/refund")
    ResponseEntity<Map<String, Object>> refund(HttpServletRequest req, @RequestBody JsonNode body) {
        if (!authorised(req)) {
            return error(HttpStatus.UNAUTHORIZED, "Incorrect authentication");
        }
        JsonNode r = body.path("refunds").path(0);
        Tx tx = bySession.get(r.path("sessionId").asString(""));
        boolean ok = tx != null && r.path("amount").asLong() <= tx.amount();
        return ResponseEntity.ok(Map.of("data", java.util.List.of(Map.of("orderId", r.path("orderId").asLong(),
                "sessionId", r.path("sessionId").asString(""), "amount", r.path("amount").asLong(), "status", ok,
                "message", ok ? "success" : "Incorrect refund")), "responseCode", 0));
    }
}
