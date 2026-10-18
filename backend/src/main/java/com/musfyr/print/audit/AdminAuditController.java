package com.musfyr.print.audit;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.web.PageResponse;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@Tag(name = "Admin · Audit")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminAuditController {

    private final AuditLogRepository repository;

    public AdminAuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Operation(summary = "List audit log entries, newest first")
    public PageResponse<AuditEntry> list(@RequestParam(required = false) String entityType,
                                         @RequestParam(defaultValue = "0") @Min(0) int page,
                                         @RequestParam(defaultValue = "50") @Min(1) @Max(200) int size) {
        PageRequest pageable = PageRequest.of(page, size);
        var result = entityType == null
                ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable);
        return PageResponse.from(result, AuditEntry::of);
    }

    public record AuditEntry(Long id, UUID actorId, String actorEmail, String action, String entityType,
                             String entityId, String details, String ipAddress, String correlationId,
                             Instant createdAt) {
        static AuditEntry of(AuditLog log) {
            return new AuditEntry(log.getId(), log.getActorId(), log.getActorEmail(), log.getAction(),
                    log.getEntityType(), log.getEntityId(), log.getDetails(), log.getIpAddress(),
                    log.getCorrelationId(), log.getCreatedAt());
        }
    }
}
