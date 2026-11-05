package com.musfyr.print.design;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.common.error.NotFoundException;

@Service
public class TemplateService {

    public static final String CACHE = "design-templates";

    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;
    private final AuditService audit;

    public TemplateService(JdbcClient jdbc, JsonMapper jsonMapper, AuditService audit) {
        this.jdbc = jdbc;
        this.jsonMapper = jsonMapper;
        this.audit = audit;
    }

    public record TemplateView(String slug, String category, String name, String family, JsonNode document) {
    }

    public record AdminTemplate(UUID id, String slug, String category, String name, String family, String status,
                                int sortOrder, JsonNode document, JsonNode i18n) {
    }

    public record TemplateRequest(@NotBlank @Size(max = 80) @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
                                  @NotBlank String category,
                                  @NotBlank @Size(max = 120) String name,
                                  @NotBlank @Pattern(regexp = "APPAREL|STICKER|ANY") String family,
                                  @NotNull JsonNode document,
                                  JsonNode i18n,
                                  int sortOrder) {
    }

    /** Approved templates for the studio, in the requested language. */
    @Cacheable(cacheNames = CACHE, key = "#lang + ':' + #family")
    public List<TemplateView> approved(String lang, String family) {
        return jdbc.sql("""
                SELECT slug, category, COALESCE(i18n -> :lang ->> 'name', name) AS name, family,
                       COALESCE(i18n -> :lang -> 'document', document)::text AS document
                FROM design_templates
                WHERE status = 'APPROVED' AND (:family = 'ANY' OR family IN (:family, 'ANY'))
                ORDER BY sort_order, name""")
                .param("lang", lang).param("family", family)
                .query((rs, i) -> new TemplateView(rs.getString("slug"), rs.getString("category"), rs.getString("name"),
                        rs.getString("family"), jsonMapper.readTree(rs.getString("document"))))
                .list();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN', 'DESIGNER')")
    public List<AdminTemplate> all() {
        return jdbc.sql("""
                SELECT id, slug, category, name, family, status, sort_order, document::text AS document, i18n::text AS i18n
                FROM design_templates ORDER BY status, sort_order, name""")
                .query((rs, i) -> new AdminTemplate(rs.getObject("id", UUID.class), rs.getString("slug"),
                        rs.getString("category"), rs.getString("name"), rs.getString("family"), rs.getString("status"),
                        rs.getInt("sort_order"), jsonMapper.readTree(rs.getString("document")),
                        jsonMapper.readTree(rs.getString("i18n"))))
                .list();
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'DESIGNER')")
    @CacheEvict(cacheNames = CACHE, allEntries = true)
    public void create(TemplateRequest req) {
        validate(req.document());
        if (jdbc.sql("SELECT count(*) FROM design_templates WHERE slug = :s").param("s", req.slug()).query(Long.class).single() > 0) {
            throw new ConflictException("A template with slug '" + req.slug() + "' already exists");
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO design_templates (id, slug, category, name, family, document, i18n, sort_order)
                VALUES (:id, :slug, :cat, :name, :family, CAST(:doc AS jsonb), CAST(:i18n AS jsonb), :sort)""")
                .param("id", id).param("slug", req.slug()).param("cat", req.category()).param("name", req.name())
                .param("family", req.family()).param("doc", jsonMapper.writeValueAsString(req.document()))
                .param("i18n", req.i18n() == null ? "{}" : jsonMapper.writeValueAsString(req.i18n()))
                .param("sort", req.sortOrder()).update();
        audit.record("TEMPLATE_CREATED", "DesignTemplate", id.toString(), Map.of("slug", req.slug()));
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'DESIGNER')")
    @CacheEvict(cacheNames = CACHE, allEntries = true)
    public void changeStatus(UUID id, String status) {
        if (!List.of("DRAFT", "APPROVED", "RETIRED").contains(status)) {
            throw new BusinessRuleException("Unknown status " + status);
        }
        int n = jdbc.sql("UPDATE design_templates SET status = :s, updated_at = now() WHERE id = :id")
                .param("s", status).param("id", id).update();
        if (n == 0) {
            throw new NotFoundException("Template", id);
        }
        audit.record("TEMPLATE_STATUS_CHANGED", "DesignTemplate", id.toString(), Map.of("status", status));
    }

    /** Template documents use fractions of the print area so they fit any product. */
    static void validate(JsonNode doc) {
        if (doc == null || doc.path("version").asInt(0) != 1 || !doc.path("objects").isArray() || doc.path("objects").isEmpty()) {
            throw new BusinessRuleException("Template documents need version 1 and at least one object");
        }
        for (JsonNode o : doc.path("objects")) {
            String type = o.path("type").asString("");
            if (!List.of("text", "shape").contains(type)) {
                throw new BusinessRuleException("Template objects must be text or shape");
            }
            for (String f : List.of("x", "y")) {
                double v = o.path(f).asDouble(-1);
                if (v < 0 || v > 1) {
                    throw new BusinessRuleException("Template positions must be fractions between 0 and 1");
                }
            }
        }
    }
}
