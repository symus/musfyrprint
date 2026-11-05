package com.musfyr.print.payments;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.commerce.OrderService;
import com.musfyr.print.common.web.PageResponse;

@RestController
@Tag(name = "Payments")
@Validated
public class PaymentController {

    private final PaymentService payments;
    private final OrderService orders;
    private final AuditService audit;

    public PaymentController(PaymentService payments, OrderService orders, AuditService audit) {
        this.payments = payments;
        this.orders = orders;
        this.audit = audit;
    }

    /**
     * Przelewy24 transaction notification (urlStatus). Server-to-server: authenticated by signature and confirmed with
     * a verify call, so it is exempt from CSRF. Answers 200 for processed and duplicate notifications.
     */
    @PostMapping("/api/v1/payments/p24/notify")
    @Operation(summary = "Przelewy24 status notification (called by Przelewy24)")
    public ResponseEntity<String> notify(@RequestBody P24Notification notification, HttpServletRequest req) {
        PaymentService.NotificationResult result;
        try {
            result = payments.handleNotification(notification, req.getRemoteAddr());
        } catch (PaymentProviderException e) {
            // verify call failed (network): let Przelewy24 retry later
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("RETRY");
        }
        return switch (result) {
            case OK, IGNORED_DUPLICATE, VERIFY_FAILED -> ResponseEntity.ok("OK");
            case NOT_FOUND -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("UNKNOWN");
            case REJECTED -> ResponseEntity.status(HttpStatus.BAD_REQUEST).body("REJECTED");
        };
    }

    // ------------------------------------------------------------------------------------------------ admin

    @GetMapping("/api/v1/admin/orders")
    public PageResponse<OrderService.OrderSummary> list(@RequestParam(required = false) @Pattern(regexp = "^[A-Z_]{3,30}$") String status,
                                                       @RequestParam(required = false) @Size(max = 100) String q,
                                                       @RequestParam(defaultValue = "0") @Min(0) int page,
                                                       @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return orders.adminList(status, q, page, size);
    }

    public record AdminOrder(OrderService.OrderView order, List<OrderService.PaymentEvent> paymentEvents) {
    }

    @GetMapping("/api/v1/admin/orders/{number}")
    public AdminOrder detail(@PathVariable String number) {
        return new AdminOrder(orders.adminView(number), orders.paymentEvents(number));
    }

    public record RefundRequest(@Size(max = 200) String reason) {
    }

    @PostMapping("/api/v1/admin/orders/{number}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Request a full refund through Przelewy24")
    public void refund(@PathVariable String number, @RequestBody(required = false) RefundRequest body) {
        payments.refund(number, body == null ? null : body.reason());
        auditInTx(number, "ORDER_REFUND_REQUESTED");
    }

    @PostMapping("/api/v1/admin/orders/{number}/refund/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark a requested refund as completed (after checking the Przelewy24 panel)")
    public void confirmRefund(@PathVariable String number) {
        payments.confirmRefund(number);
        auditInTx(number, "ORDER_REFUND_CONFIRMED");
    }

    private void auditInTx(String number, String action) {
        audit.recordStandalone(action, "Order", number);
    }
}
