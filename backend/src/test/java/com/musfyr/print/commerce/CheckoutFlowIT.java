package com.musfyr.print.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.payments.P24Notification;
import com.musfyr.print.payments.P24Signer;
import com.musfyr.print.support.TestDatabaseConfig;
import com.musfyr.print.support.TestTokens;

/**
 * Full purchase over real HTTP: the Przelewy24 client talks to the in-process simulator, which sends the signed
 * notification back to the shop – exactly the production sequence.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestDatabaseConfig.class)
class CheckoutFlowIT {

    @LocalServerPort
    int port;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    P24Signer signer;

    @Autowired
    TestTokens tokens;

    private HttpClient http;
    private CookieManager cookies;

    @BeforeEach
    void client() {
        cookies = new CookieManager();
        http = HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private String xsrf() throws Exception {
        if (cookies.getCookieStore().getCookies().stream().noneMatch(c -> c.getName().equals("XSRF-TOKEN"))) {
            http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/auth/csrf"))).GET().build(), HttpResponse.BodyHandlers.ofString());
        }
        return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("XSRF-TOKEN"))
                .map(HttpCookie::getValue).findFirst().orElseThrow();
    }

    private HttpResponse<String> send(String method, String path, String body, String... headers) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url(path))).header("Content-Type", "application/json")
                .header("Accept-Language", "pl");
        if (!"GET".equals(method)) {
            b.header("X-XSRF-TOKEN", xsrf());
        }
        for (int i = 0; i < headers.length; i += 2) {
            b.header(headers[i], headers[i + 1]);
        }
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static final String CHECKOUT = """
            {"email":"klient@example.com","shippingAddress":{"fullName":"Anna Kowalska","line1":"ul. Długa 1","postalCode":"00-001",
             "city":"Warszawa","country":"PL","phone":"+48 600 100 200"},"shippingMethod":"INPOST_LOCKER","pickupPoint":"WAW01M",
             "promotionCode":"WELCOME10","acceptTerms":true,"locale":"pl"}""";

    private int stock(String sku) {
        return jdbc.sql("SELECT stock_quantity FROM product_variants WHERE sku = :s").param("s", sku).query(Integer.class).single();
    }

    @Test
    void guestBuysWithPrzelewy24AndOrderIsPaidOnlyAfterVerification() throws Exception {
        int stockBefore = stock("CUT-BLACK-M");

        // Cart with server-side prices
        var add = send("POST", "/api/v1/cart/items", "{\"productSlug\":\"classic-unisex-tee\",\"colorCode\":\"black\",\"sizeCode\":\"M\",\"quantity\":2}");
        assertThat(add.statusCode()).isEqualTo(201);
        assertThat(add.headers().allValues("set-cookie")).anyMatch(c -> c.startsWith("mp_cart=") && c.contains("HttpOnly"));
        var cart = send("GET", "/api/v1/cart?shippingMethod=INPOST_LOCKER", null).body();
        assertThat((Integer) JsonPath.read(cart, "$.total.amountMinor")).isEqualTo(2 * 5900 + 1499);
        assertThat((String) JsonPath.read(cart, "$.lines[0].productName")).isEqualTo("Klasyczna koszulka unisex");
        var promo = send("PUT", "/api/v1/cart/promotion", "{\"code\":\"welcome10\"}").body();
        assertThat((Integer) JsonPath.read(promo, "$.discount.amountMinor")).isEqualTo(1180);

        // Checkout is idempotent
        String key = UUID.randomUUID().toString();
        var placed = send("POST", "/api/v1/checkout", CHECKOUT, "Idempotency-Key", key);
        assertThat(placed.statusCode()).as(placed.body()).isEqualTo(200);
        String number = JsonPath.read(placed.body(), "$.orderNumber");
        String token = JsonPath.read(placed.body(), "$.accessToken");
        String redirect = JsonPath.read(placed.body(), "$.redirectUrl");
        assertThat(redirect).contains("/dev/p24-simulator/trnRequest/");
        assertThat((String) JsonPath.read(send("POST", "/api/v1/checkout", CHECKOUT, "Idempotency-Key", key).body(), "$.orderNumber")).isEqualTo(number);

        var pending = send("GET", "/api/v1/orders/" + number + "?token=" + token, null).body();
        assertThat((String) JsonPath.read(pending, "$.status")).isEqualTo("PENDING_PAYMENT");
        assertThat((Integer) JsonPath.read(pending, "$.total.amountMinor")).isEqualTo(11800 - 1180 + 1499);
        assertThat(send("GET", "/api/v1/orders/" + number + "?token=wrong", null).statusCode()).isEqualTo(404);
        assertThat(stock("CUT-BLACK-M")).isEqualTo(stockBefore); // not committed before payment

        // The customer pays on the (simulated) Przelewy24 page; P24 notifies the shop, the shop verifies.
        String paymentToken = redirect.substring(redirect.lastIndexOf('/') + 1);
        var paid = http.send(HttpRequest.newBuilder(URI.create(url("/dev/p24-simulator/trnRequest/" + paymentToken + "/pay")))
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(paid.statusCode()).isEqualTo(303);
        assertThat(paid.headers().firstValue("location").orElseThrow()).contains("/pl/checkout/complete?order=" + number + "&t=" + token);

        var done = send("GET", "/api/v1/orders/" + number + "?token=" + token, null).body();
        assertThat((String) JsonPath.read(done, "$.status")).isEqualTo("PAID");
        assertThat((String) JsonPath.read(done, "$.paymentStatus")).isEqualTo("PAID");
        assertThat(stock("CUT-BLACK-M")).isEqualTo(stockBefore - 2);
        assertThat(jdbc.sql("SELECT redemptions FROM promotions WHERE code = 'WELCOME10'").query(Integer.class).single()).isEqualTo(1);
        assertThat((Integer) JsonPath.read(send("GET", "/api/v1/cart", null).body(), "$.itemCount")).isZero();
        var confirmation = TestDatabaseConfig.SENT.stream()
                .filter(e -> e.to().equals("klient@example.com") && e.subject().contains(number)).findFirst().orElseThrow();
        // Guests get their own order link in the e-mail; it opens the order like the checkout token does.
        var link = java.util.regex.Pattern.compile("/pl/orders/" + number + "\\?t=([A-Za-z0-9_-]+)").matcher(confirmation.text());
        assertThat(link.find()).isTrue();
        assertThat(send("GET", "/api/v1/orders/" + number + "?token=" + link.group(1), null).statusCode()).isEqualTo(200);

        // Duplicate notification: acknowledged, nothing changes
        record S(String session, long orderId) {
        }
        S s = jdbc.sql("SELECT session_id, provider_order_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.number = :n")
                .param("n", number).query((rs, i) -> new S(rs.getString(1), rs.getLong(2))).single();
        long total = 11800 - 1180 + 1499;
        P24Notification unsigned = new P24Notification(22222, 22222, s.session(), total, total, "PLN", s.orderId(), 154, "stmt", null);
        String sign = signer.notificationSign(unsigned, "test-crc-key");
        String dup = "{\"merchantId\":22222,\"posId\":22222,\"sessionId\":\"%s\",\"amount\":%d,\"originAmount\":%d,\"currency\":\"PLN\",\"orderId\":%d,\"methodId\":154,\"statement\":\"stmt\",\"sign\":\"%s\"}"
                .formatted(s.session(), total, total, s.orderId(), sign);
        assertThat(http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/payments/p24/notify"))).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(dup)).build(), HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(200);
        assertThat(stock("CUT-BLACK-M")).isEqualTo(stockBefore - 2);

        // Forged notification (bad signature) is rejected
        String forged = dup.replace(sign, "0".repeat(96));
        assertThat(http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/payments/p24/notify"))).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(forged)).build(), HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(400);

        // Admin refund through Przelewy24, then confirmation
        String admin = tokens.bearer(Role.ADMIN);
        var refund = http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/admin/orders/" + number + "/refund")))
                .header("Authorization", admin).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"reason\":\"Customer request\"}")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(refund.statusCode()).as(refund.body()).isEqualTo(200);
        assertThat((String) JsonPath.read(send("GET", "/api/v1/orders/" + number + "?token=" + token, null).body(), "$.status")).isEqualTo("REFUND_PENDING");
        http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/admin/orders/" + number + "/refund/confirm")))
                .header("Authorization", admin).POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        var admins = http.send(HttpRequest.newBuilder(URI.create(url("/api/v1/admin/orders/" + number))).header("Authorization", admin).GET().build(),
                HttpResponse.BodyHandlers.ofString()).body();
        assertThat((String) JsonPath.read(admins, "$.order.status")).isEqualTo("REFUNDED");
        assertThat((java.util.List<String>) JsonPath.read(admins, "$.paymentEvents[*].type"))
                .contains("REGISTERED", "VERIFIED", "NOTIFICATION_DUPLICATE", "REFUND_REQUESTED");
        assertThat((java.util.List<String>) JsonPath.read(admins, "$.order.events[*].status"))
                .containsExactly("PENDING_PAYMENT", "PAID", "REFUND_PENDING", "REFUNDED");
    }

    @Test
    void declinedPaymentLeavesTheOrderUnpaidAndRetryable() throws Exception {
        send("POST", "/api/v1/cart/items", "{\"productSlug\":\"die-cut-vinyl-sticker\",\"colorCode\":\"white\",\"sizeCode\":\"5x5CM\",\"quantity\":1,\"options\":{\"finish\":\"matte\",\"material\":\"vinyl\"}}");
        var placed = send("POST", "/api/v1/checkout", CHECKOUT.replace("\"promotionCode\":\"WELCOME10\",", ""));
        String number = JsonPath.read(placed.body(), "$.orderNumber");
        String token = JsonPath.read(placed.body(), "$.accessToken");
        String redirect = JsonPath.read(placed.body(), "$.redirectUrl");
        String paymentToken = redirect.substring(redirect.lastIndexOf('/') + 1);
        http.send(HttpRequest.newBuilder(URI.create(url("/dev/p24-simulator/trnRequest/" + paymentToken + "/decline")))
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        var order = send("GET", "/api/v1/orders/" + number + "?token=" + token, null).body();
        assertThat((String) JsonPath.read(order, "$.status")).isEqualTo("PENDING_PAYMENT");
        assertThat((Boolean) JsonPath.read(order, "$.canPay")).isTrue();
        var retry = send("POST", "/api/v1/orders/" + number + "/pay", "{\"token\":\"" + token + "\"}");
        assertThat(retry.statusCode()).isEqualTo(200);
        assertThat((String) JsonPath.read(retry.body(), "$.url")).contains("/trnRequest/");
        assertThat(send("POST", "/api/v1/orders/" + number + "/pay", "{\"token\":\"nope\"}").statusCode()).isEqualTo(404);
    }

    @Test
    void checkoutValidatesDeliveryTermsAndCart() throws Exception {
        assertThat(send("POST", "/api/v1/checkout", CHECKOUT).statusCode()).isEqualTo(422); // empty cart
        send("POST", "/api/v1/cart/items", "{\"productSlug\":\"everyday-tote\",\"colorCode\":\"natural\",\"sizeCode\":\"ONE_SIZE\",\"quantity\":1}");
        assertThat(send("POST", "/api/v1/checkout", CHECKOUT.replace("\"pickupPoint\":\"WAW01M\",", "")).statusCode()).isEqualTo(422);
        assertThat(send("POST", "/api/v1/checkout", CHECKOUT.replace("\"acceptTerms\":true", "\"acceptTerms\":false")).statusCode()).isEqualTo(400);
        assertThat(send("POST", "/api/v1/checkout", CHECKOUT.replace("00-001", "00001")).statusCode()).isEqualTo(400);
        assertThat(send("POST", "/api/v1/checkout", CHECKOUT.replace("WELCOME10", "NOPE")).statusCode()).isEqualTo(422);
        // sticker options are required
        assertThat(send("POST", "/api/v1/cart/items", "{\"productSlug\":\"die-cut-vinyl-sticker\",\"colorCode\":\"white\",\"sizeCode\":\"5x5CM\",\"quantity\":1}").statusCode()).isEqualTo(422);
    }
}
