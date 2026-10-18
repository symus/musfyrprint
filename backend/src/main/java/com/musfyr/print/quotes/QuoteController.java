package com.musfyr.print.quotes;

import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.web.PageResponse;

@RestController
@Tag(name = "Bulk & business quotes")
@Validated
public class QuoteController {

    private final QuoteService quotes;

    public QuoteController(QuoteService quotes) {
        this.quotes = quotes;
    }

    @PostMapping("/api/v1/quotes")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Request a bulk / corporate quotation (minimum 10 pieces)")
    public QuoteService.QuoteCreated submit(@Valid @RequestBody QuoteService.QuoteSubmission submission) {
        return quotes.submit(submission);
    }

    @GetMapping("/api/v1/admin/quotes")
    @Operation(summary = "List quotation requests")
    public PageResponse<QuoteService.QuoteView> list(@RequestParam(required = false) QuoteRequest.Status status,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return quotes.list(status, page, size);
    }

    @PostMapping("/api/v1/admin/quotes/{id}/status")
    @Operation(summary = "Move a quotation request through the sales pipeline")
    public QuoteService.QuoteView updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return quotes.updateStatus(id, request.status());
    }

    public record StatusRequest(@NotNull QuoteRequest.Status status) {
    }
}
