package com.musfyr.print.payments;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Przelewy24 settings (REST API v1). Credentials come from the P24 merchant panel: merchant ID, POS ID,
 * "API key" (reports key, used for HTTP Basic auth) and CRC key (used for signatures).
 *
 * @param mode DISABLED (checkout unavailable), SIMULATOR (built-in test payment page – no real money),
 *             SANDBOX (sandbox.przelewy24.pl) or PRODUCTION (secure.przelewy24.pl)
 * @param notificationIps optional allowlist of P24 notification source IPs (empty = signature + verify only)
 */
@ConfigurationProperties(prefix = "app.payments.p24")
public record P24Properties(@DefaultValue("DISABLED") String mode,
                            @DefaultValue("0") int merchantId,
                            @DefaultValue("0") int posId,
                            @DefaultValue("") String apiKey,
                            @DefaultValue("") String crcKey,
                            @DefaultValue("15") int timeLimitMinutes,
                            @DefaultValue List<String> notificationIps) {

    public boolean enabled() {
        return !"DISABLED".equals(mode);
    }

    public boolean simulator() {
        return "SIMULATOR".equals(mode);
    }

    public String providerBaseUrl() {
        return "PRODUCTION".equals(mode) ? "https://secure.przelewy24.pl" : "https://sandbox.przelewy24.pl";
    }

    public int effectivePosId() {
        return posId == 0 ? merchantId : posId;
    }
}
