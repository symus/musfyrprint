package com.musfyr.print.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.payments.P24Notification;
import com.musfyr.print.payments.P24Signer;

class P24SignerTest {

    private final P24Signer signer = new P24Signer(JsonMapper.builder().build());

    private static String sha384(String s) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-384").digest(s.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void registerSignatureMatchesTheDocumentedJsonLayout() throws Exception {
        // Same compact, ordered JSON as JSON.stringify in the reference client.
        String json = "{\"sessionId\":\"MP-1001-ab/c\",\"merchantId\":11111,\"amount\":7398,\"currency\":\"PLN\",\"crc\":\"crc-key\"}";
        assertThat(signer.registerSign("MP-1001-ab/c", 11111, 7398, "PLN", "crc-key")).isEqualTo(sha384(json));
    }

    @Test
    void verifyAndNotificationSignaturesUseTheirOwnFieldOrder() throws Exception {
        assertThat(signer.verifySign("S1", 987654321L, 100, "PLN", "k"))
                .isEqualTo(sha384("{\"sessionId\":\"S1\",\"orderId\":987654321,\"amount\":100,\"currency\":\"PLN\",\"crc\":\"k\"}"));
        var n = new P24Notification(11111, 11111, "S1", 100, 100, "PLN", 987654321L, 154, "p24-ąę", null);
        assertThat(signer.notificationSign(n, "k")).isEqualTo(sha384(
                "{\"merchantId\":11111,\"posId\":11111,\"sessionId\":\"S1\",\"amount\":100,\"originAmount\":100,\"currency\":\"PLN\","
                        + "\"orderId\":987654321,\"methodId\":154,\"statement\":\"p24-ąę\",\"crc\":\"k\"}"));
    }

    @Test
    void comparisonIsExact() {
        assertThat(P24Signer.matches("abc", "abc")).isTrue();
        assertThat(P24Signer.matches("abc", "abd")).isFalse();
        assertThat(P24Signer.matches("abc", null)).isFalse();
    }
}
