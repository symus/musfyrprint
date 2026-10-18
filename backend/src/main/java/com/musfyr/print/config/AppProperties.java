package com.musfyr.print.config;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Typed application configuration. Everything brand-, market- or secret-related is sourced from
 * environment variables (see {@code .env.example}) so the platform can be re-branded and moved to
 * new markets without code changes.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Brand brand, Commerce commerce, Security security, BootstrapAdmin bootstrapAdmin) {

    public record Brand(String name, String tagline, String supportEmail, String supportPhone, String address,
                        Map<String, String> social) {
    }

    public record Commerce(String defaultCurrency, String defaultLocale, List<String> supportedCurrencies,
                           List<String> supportedLocales, @DefaultValue("EU") String defaultSizeSystem) {
    }

    public record Security(String jwtSecret, String jwtIssuer, Duration accessTokenTtl, boolean cookieSecure,
                           String cookieSameSite, List<String> corsAllowedOrigins,
                           @DefaultValue("5") int maxFailedLogins,
                           @DefaultValue("PT15M") Duration lockoutDuration) {
    }

    public record BootstrapAdmin(String email, String password, String displayName) {
    }
}
