package com.musfyr.print.audit;

import java.util.Map;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.web.CorrelationIdFilter;
import com.musfyr.print.common.web.RequestContext;

/** Records sensitive actions. Runs inside the caller's transaction so audit and change commit together. */
@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final JsonMapper jsonMapper;

    public AuditService(AuditLogRepository repository, JsonMapper jsonMapper) {
        this.repository = repository;
        this.jsonMapper = jsonMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String entityType, String entityId, Map<String, ?> details) {
        UUID actorId = null;
        String actorEmail = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            actorId = UUID.fromString(jwt.getSubject());
            actorEmail = jwt.getClaimAsString("email");
        }
        recordAs(actorId, actorEmail, action, entityType, entityId, details);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordAs(UUID actorId, String actorEmail, String action, String entityType, String entityId,
                         Map<String, ?> details) {
        String json = details == null || details.isEmpty() ? null : jsonMapper.writeValueAsString(details);
        repository.save(new AuditLog(actorId, actorEmail, action, entityType, entityId, json,
                RequestContext.clientIp(), MDC.get(CorrelationIdFilter.MDC_KEY)));
    }
}
