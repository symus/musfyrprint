package com.musfyr.print.payments;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import com.musfyr.print.commerce.ShopProperties;

/**
 * Przelewy24 REST API v1 client: register → redirect customer to /trnRequest/{token} → receive signed
 * notification → PUT /transaction/verify (a payment is final only after a successful verify).
 */
@Component
public class P24Client {

    private final P24Properties props;
    private final P24Signer signer;
    private final LocalServerUrl localServer;
    private final ShopProperties shop;
    private final RestClient.Builder builder;

    public P24Client(P24Properties props, P24Signer signer, LocalServerUrl localServer, ShopProperties shop,
                     RestClient.Builder builder) {
        this.props = props;
        this.signer = signer;
        this.localServer = localServer;
        this.shop = shop;
        this.builder = builder;
    }

    public record Registration(String token, String redirectUrl) {
    }

    /** Server-to-server API base. */
    String apiBase() {
        return (props.simulator() ? localServer.get() + P24Simulator.PATH : props.providerBaseUrl()) + "/api/v1";
    }

    /** Where the customer's browser is sent. */
    String paymentPageBase() {
        return props.simulator() ? shop.publicApiUrl() + P24Simulator.PATH : props.providerBaseUrl();
    }

    /** Notification URL given to P24 (the simulator calls it in-process). */
    public String notificationUrl() {
        return (props.simulator() ? localServer.get() : shop.publicApiUrl()) + "/api/v1/payments/p24/notify";
    }

    private RestClient client() {
        return builder.baseUrl(apiBase())
                .defaultHeaders(h -> h.setBasicAuth(String.valueOf(props.effectivePosId()), props.apiKey()))
                .build();
    }

    public Registration register(String sessionId, long amount, String currency, String description, String email,
                                 String customerName, String language, String urlReturn) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("merchantId", props.merchantId());
        body.put("posId", props.effectivePosId());
        body.put("sessionId", sessionId);
        body.put("amount", amount);
        body.put("currency", currency);
        body.put("description", description);
        body.put("email", email);
        body.put("client", customerName);
        body.put("country", "PL");
        body.put("language", language);
        body.put("urlReturn", urlReturn);
        body.put("urlStatus", notificationUrl());
        body.put("timeLimit", props.timeLimitMinutes());
        body.put("encoding", "UTF-8");
        body.put("sign", signer.registerSign(sessionId, props.merchantId(), amount, currency, props.crcKey()));
        try {
            JsonNode res = client().post().uri("/transaction/register").contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(JsonNode.class);
            String token = res == null ? null : res.path("data").path("token").asString(null);
            if (token == null || token.isBlank()) {
                throw new PaymentProviderException("Przelewy24 did not return a payment token");
            }
            return new Registration(token, paymentPageBase() + "/trnRequest/" + token);
        } catch (RestClientException e) {
            throw new PaymentProviderException("Przelewy24 registration failed", e);
        }
    }

    public boolean verify(String sessionId, long orderId, long amount, String currency) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("merchantId", props.merchantId());
        body.put("posId", props.effectivePosId());
        body.put("sessionId", sessionId);
        body.put("amount", amount);
        body.put("currency", currency);
        body.put("orderId", orderId);
        body.put("sign", signer.verifySign(sessionId, orderId, amount, currency, props.crcKey()));
        try {
            JsonNode res = client().put().uri("/transaction/verify").contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(JsonNode.class);
            return res != null && "success".equals(res.path("data").path("status").asString(""));
        } catch (RestClientException e) {
            throw new PaymentProviderException("Przelewy24 verification failed", e);
        }
    }

    public boolean refund(String requestId, String refundsUuid, long orderId, String sessionId, long amount, String description) {
        Map<String, Object> refund = new LinkedHashMap<>();
        refund.put("orderId", orderId);
        refund.put("sessionId", sessionId);
        refund.put("amount", amount);
        refund.put("description", description);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requestId", requestId);
        body.put("refunds", java.util.List.of(refund));
        body.put("refundsUuid", refundsUuid);
        try {
            JsonNode res = client().post().uri("/transaction/refund").contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(JsonNode.class);
            JsonNode first = res == null ? null : res.path("data").path(0);
            return first != null && first.path("status").asBoolean(false);
        } catch (RestClientException e) {
            throw new PaymentProviderException("Przelewy24 refund failed", e);
        }
    }
}
