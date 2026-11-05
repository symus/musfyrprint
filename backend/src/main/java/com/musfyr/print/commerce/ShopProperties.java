package com.musfyr.print.commerce;

import java.math.BigDecimal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Shop-wide commerce settings.
 *
 * @param publicSiteUrl storefront URL used in payment return links and e-mails
 * @param publicApiUrl  public URL of this API, used for payment provider notifications
 */
@ConfigurationProperties(prefix = "app.shop")
public record ShopProperties(@DefaultValue("http://localhost:3000") String publicSiteUrl,
                             @DefaultValue("http://localhost:8080") String publicApiUrl,
                             @DefaultValue Tax tax,
                             @DefaultValue Mail mail) {

    /**
     * EXEMPT: seller is not VAT-registered (Polish art. 113 exemption) – no VAT is charged or shown.
     * STANDARD: prices include VAT at {@code standardRatePercent}.
     */
    public record Tax(@DefaultValue("EXEMPT") String mode, @DefaultValue("23") BigDecimal standardRatePercent) {
    }

    public record Mail(@DefaultValue("no-reply@example.com") String from) {
    }
}
