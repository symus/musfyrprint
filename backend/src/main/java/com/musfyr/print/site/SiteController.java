package com.musfyr.print.site;

import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.config.AppProperties;

@RestController
@RequestMapping("/api/v1/site")
@Tag(name = "Site")
public class SiteController {

    private final AppProperties props;

    public SiteController(AppProperties props) {
        this.props = props;
    }

    @GetMapping("/config")
    @Operation(summary = "Public brand and market configuration",
            description = "Lets the storefront be re-branded and localised without a rebuild.")
    public SiteConfig config() {
        AppProperties.Brand b = props.brand();
        AppProperties.Commerce c = props.commerce();
        return new SiteConfig(b.name(), b.tagline(), b.supportEmail(), b.supportPhone(), b.address(),
                b.social() == null ? Map.of() : b.social(), c.defaultCurrency(), c.defaultLocale(),
                c.supportedCurrencies(), c.supportedLocales(), c.defaultSizeSystem());
    }

    public record SiteConfig(String brandName, String tagline, String supportEmail, String supportPhone,
                             String address, Map<String, String> social, String defaultCurrency,
                             String defaultLocale, List<String> supportedCurrencies, List<String> supportedLocales,
                             String defaultSizeSystem) {
    }
}
