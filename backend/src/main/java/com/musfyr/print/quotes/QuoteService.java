package com.musfyr.print.quotes;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.PageResponse;
import com.musfyr.print.common.web.RequestContext;

/** Bulk, corporate, team and event merchandise enquiries. */
@Service
public class QuoteService {

    private static final char[] REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final QuoteRequestRepository repository;
    private final RateLimiter rateLimiter;
    private final AuditService audit;

    public QuoteService(QuoteRequestRepository repository, RateLimiter rateLimiter, AuditService audit) {
        this.repository = repository;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
    }

    @Transactional
    public QuoteCreated submit(QuoteSubmission s) {
        rateLimiter.check("quote", RequestContext.clientIp(), 5, Duration.ofMinutes(30));
        QuoteRequest quote = repository.save(new QuoteRequest(newReference(), s.contactName().trim(),
                s.email().trim().toLowerCase(), s.phone(), s.company(), s.productInterest().trim(), s.quantity(),
                s.neededBy(), s.message()));
        // TODO(phase-4): notify the sales inbox via the notification module once e-mail delivery is configured.
        return new QuoteCreated(quote.getReference(), quote.getStatus().name());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public PageResponse<QuoteView> list(QuoteRequest.Status status, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        var result = status == null ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return PageResponse.from(result, QuoteView::of);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public QuoteView updateStatus(UUID id, QuoteRequest.Status status) {
        QuoteRequest quote = repository.findById(id).orElseThrow(() -> new NotFoundException("Quote request", id));
        String previous = quote.getStatus().name();
        quote.setStatus(status);
        audit.record("QUOTE_STATUS_CHANGED", "QuoteRequest", id.toString(),
                Map.of("from", previous, "to", status.name()));
        return QuoteView.of(quote);
    }

    private static String newReference() {
        StringBuilder sb = new StringBuilder("Q-");
        for (int i = 0; i < 8; i++) {
            sb.append(REF_ALPHABET[RANDOM.nextInt(REF_ALPHABET.length)]);
        }
        return sb.toString();
    }

    public record QuoteSubmission(@NotBlank @Size(max = 120) String contactName,
                                  @NotBlank @Email @Size(max = 255) String email,
                                  @Size(max = 40) @Pattern(regexp = "^[0-9 +()-]*$") String phone,
                                  @Size(max = 160) String company,
                                  @NotBlank @Size(max = 160) String productInterest,
                                  @NotNull @Min(10) @Max(100_000) Integer quantity,
                                  @FutureOrPresent LocalDate neededBy,
                                  @Size(max = 4000) String message) {
    }

    public record QuoteCreated(String reference, String status) {
    }

    public record QuoteView(UUID id, String reference, String contactName, String email, String phone,
                            String company, String productInterest, int quantity, LocalDate neededBy, String message,
                            String status, Instant createdAt) {
        static QuoteView of(QuoteRequest q) {
            return new QuoteView(q.getId(), q.getReference(), q.getContactName(), q.getEmail(), q.getPhone(),
                    q.getCompany(), q.getProductInterest(), q.getQuantity(), q.getNeededBy(), q.getMessage(),
                    q.getStatus().name(), q.getCreatedAt());
        }
    }
}
