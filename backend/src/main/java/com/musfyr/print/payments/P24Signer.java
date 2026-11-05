package com.musfyr.print.payments;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Przelewy24 signatures: SHA-384 (hex) of a compact JSON object whose fields appear in a fixed order and end with
 * the CRC key. Field order matters, so callers pass ordered maps built by the helpers below.
 */
@Component
public class P24Signer {

    private final JsonMapper json;

    public P24Signer(JsonMapper json) {
        this.json = json;
    }

    public String registerSign(String sessionId, int merchantId, long amount, String currency, String crc) {
        return sign(ordered("sessionId", sessionId, "merchantId", merchantId, "amount", amount, "currency", currency, "crc", crc));
    }

    public String verifySign(String sessionId, long orderId, long amount, String currency, String crc) {
        return sign(ordered("sessionId", sessionId, "orderId", orderId, "amount", amount, "currency", currency, "crc", crc));
    }

    public String notificationSign(P24Notification n, String crc) {
        return sign(ordered("merchantId", n.merchantId(), "posId", n.posId(), "sessionId", n.sessionId(),
                "amount", n.amount(), "originAmount", n.originAmount(), "currency", n.currency(),
                "orderId", n.orderId(), "methodId", n.methodId(), "statement", n.statement(), "crc", crc));
    }

    String sign(Map<String, Object> fields) {
        String payload = json.writeValueAsString(fields);
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-384").digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Constant-time comparison so signature checks don't leak timing. */
    public static boolean matches(String expected, String actual) {
        return actual != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII));
    }

    private static Map<String, Object> ordered(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }
}
