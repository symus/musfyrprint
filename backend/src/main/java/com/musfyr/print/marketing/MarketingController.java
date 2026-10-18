package com.musfyr.print.marketing;

import java.time.Duration;
import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.i18n.ContentLanguage;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Marketing")
public class MarketingController {

    static final String CONSENT_TEXT = "I agree to receive marketing e-mails and can unsubscribe at any time.";

    private final NewsletterRepository newsletter;
    private final PromotionQueries promotions;
    private final RateLimiter rateLimiter;
    private final ContentLanguage language;

    public MarketingController(NewsletterRepository newsletter, PromotionQueries promotions, RateLimiter rateLimiter,
                               ContentLanguage language) {
        this.newsletter = newsletter;
        this.promotions = promotions;
        this.rateLimiter = rateLimiter;
        this.language = language;
    }

    @GetMapping("/promotions/active")
    @Operation(summary = "Promotions currently advertised on the storefront")
    public List<PromotionQueries.PromotionView> activePromotions() {
        return promotions.activeBanners(language.current());
    }

    @PostMapping("/newsletter/subscriptions")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Transactional
    @Operation(summary = "Sign up for the newsletter (double opt-in)",
            description = "Always answers 202 with the same body so the endpoint cannot be used to probe for existing "
                    + "subscribers. Nothing is sent until the address is confirmed.")
    public SubscribeResponse subscribe(@Valid @RequestBody SubscribeRequest request) {
        rateLimiter.check("newsletter", RequestContext.clientIp(), 5, Duration.ofMinutes(10));
        String email = request.email().trim().toLowerCase();
        if (!newsletter.existsByEmailIgnoreCase(email)) {
            newsletter.save(new NewsletterSubscription(email, request.source(), request.locale(), CONSENT_TEXT));
        }
        return new SubscribeResponse("PENDING_CONFIRMATION");
    }

    public record SubscribeRequest(@NotBlank @Email @Size(max = 255) String email,
                                   boolean consent,
                                   @Size(max = 40) @Pattern(regexp = "^[a-z0-9-]*$") String source,
                                   @Size(max = 10) @Pattern(regexp = "^[A-Za-z-]*$") String locale) {

        @AssertTrue(message = "Marketing consent is required")
        public boolean isConsentGiven() {
            return consent;
        }
    }

    public record SubscribeResponse(String status) {
    }
}
