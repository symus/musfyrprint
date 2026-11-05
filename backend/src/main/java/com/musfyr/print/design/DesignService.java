package com.musfyr.print.design;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;

/**
 * Saved designs. Until customer accounts exist (Phase 3) a design is owned by whoever holds its edit token; only a
 * SHA-256 hash of the token is stored. Without the token a design is reported as not found.
 */
@Service
public class DesignService {

    static final int MAX_DOCUMENT_CHARS = 1_500_000;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;
    private final ArtworkService artworks;
    private final RateLimiter rateLimiter;

    public DesignService(JdbcClient jdbc, JsonMapper jsonMapper, ArtworkService artworks, RateLimiter rateLimiter) {
        this.jdbc = jdbc;
        this.jsonMapper = jsonMapper;
        this.artworks = artworks;
        this.rateLimiter = rateLimiter;
    }

    public record DesignRequest(@NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String productSlug,
                                @Size(max = 40) String colorCode,
                                @Size(max = 30) String sizeCode,
                                @Size(max = 120) String name,
                                @NotNull JsonNode document,
                                Long version) {
    }

    public record DesignView(UUID id, String productSlug, String colorCode, String sizeCode, String name,
                             JsonNode document, long version, Instant updatedAt, List<DesignChecker.Warning> warnings) {
    }

    public record Created(DesignView design, String editToken) {
    }

    @Transactional
    public Created create(DesignRequest req) {
        rateLimiter.check("design-create", RequestContext.clientIp(), 60, Duration.ofHours(1));
        Product product = product(req.productSlug());
        validateVariant(product, req);
        DesignChecker.Result check = check(req.document(), product);
        String token = newToken();
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO designs (id, edit_token_hash, product_id, color_code, size_code, name, document)
                VALUES (:id, :hash, :product, :color, :size, :name, CAST(:doc AS jsonb))""")
                .param("id", id).param("hash", hash(token)).param("product", product.id())
                .param("color", req.colorCode()).param("size", req.sizeCode()).param("name", req.name())
                .param("doc", serialize(req.document())).update();
        return new Created(load(id, check.warnings()), token);
    }

    @Transactional(readOnly = true)
    public DesignView get(UUID id, String token) {
        authorize(id, token);
        DesignView stored = load(id, List.of());
        DesignChecker.Result check = check(stored.document(), product(stored.productSlug()));
        return load(id, check.warnings());
    }

    @Transactional
    public DesignView update(UUID id, String token, DesignRequest req) {
        rateLimiter.check("design-update", RequestContext.clientIp(), 600, Duration.ofHours(1));
        authorize(id, token);
        Product product = product(req.productSlug());
        validateVariant(product, req);
        DesignChecker.Result check = check(req.document(), product);
        int updated = jdbc.sql("""
                UPDATE designs SET product_id = :product, color_code = :color, size_code = :size, name = :name,
                       document = CAST(:doc AS jsonb), version = version + 1, updated_at = now()
                WHERE id = :id AND version = :version AND status = 'DRAFT'""")
                .param("product", product.id()).param("color", req.colorCode()).param("size", req.sizeCode())
                .param("name", req.name()).param("doc", serialize(req.document()))
                .param("id", id).param("version", req.version() == null ? -1 : req.version()).update();
        if (updated == 0) {
            throw new ConflictException("This design was changed in another tab. Reload to get the latest version.");
        }
        return load(id, check.warnings());
    }

    // ---------------------------------------------------------------------------------------------------------

    private record Product(UUID id, String slug, Map<String, DesignChecker.AreaSpec> areas) {
    }

    private Product product(String slug) {
        UUID id = jdbc.sql("SELECT id FROM products WHERE slug = :slug AND status = 'ACTIVE' AND customizable")
                .param("slug", slug).query(UUID.class).optional()
                .orElseThrow(() -> new BusinessRuleException("This product cannot be personalised"));
        Map<String, DesignChecker.AreaSpec> areas = new HashMap<>();
        jdbc.sql("SELECT code, width_mm, height_mm, safe_margin_mm, min_dpi FROM print_areas WHERE product_id = :id")
                .param("id", id)
                .query(rs -> {
                    areas.put(rs.getString("code"), new DesignChecker.AreaSpec(rs.getInt("width_mm"),
                            rs.getInt("height_mm"), rs.getInt("safe_margin_mm"), rs.getInt("min_dpi")));
                });
        return new Product(id, slug, areas);
    }

    private void validateVariant(Product product, DesignRequest req) {
        if (req.colorCode() != null && jdbc.sql("""
                SELECT count(*) FROM product_colors pc JOIN colors c ON c.id = pc.color_id
                WHERE pc.product_id = :p AND c.code = :code""")
                .param("p", product.id()).param("code", req.colorCode()).query(Long.class).single() == 0) {
            throw new BusinessRuleException("This colour is not available for the product");
        }
        if (req.sizeCode() != null && jdbc.sql("""
                SELECT count(*) FROM product_variants WHERE product_id = :p AND size_code = :size AND active""")
                .param("p", product.id()).param("size", req.sizeCode()).query(Long.class).single() == 0) {
            throw new BusinessRuleException("This size is not available for the product");
        }
    }

    private DesignChecker.Result check(JsonNode document, Product product) {
        return DesignChecker.check(document, product.areas(), artworkId -> {
            ArtworkService.ArtworkMeta meta = artworks.requireActive(artworkId);
            return new DesignChecker.ArtworkPixels(meta.widthPx(), meta.heightPx(), "image/svg+xml".equals(meta.mimeType()));
        });
    }

    private String serialize(JsonNode document) {
        String json = jsonMapper.writeValueAsString(document);
        if (json.length() > MAX_DOCUMENT_CHARS) {
            throw new BusinessRuleException("The design is too large");
        }
        return json;
    }

    private void authorize(UUID id, String token) {
        String stored = jdbc.sql("SELECT edit_token_hash FROM designs WHERE id = :id").param("id", id)
                .query(String.class).optional().orElse(null);
        if (stored == null || token == null || !MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.US_ASCII), hash(token).getBytes(StandardCharsets.US_ASCII))) {
            throw new NotFoundException("Design", id);
        }
    }

    private DesignView load(UUID id, List<DesignChecker.Warning> warnings) {
        return jdbc.sql("""
                SELECT d.id, p.slug, d.color_code, d.size_code, d.name, d.document::text AS document, d.version, d.updated_at
                FROM designs d JOIN products p ON p.id = d.product_id WHERE d.id = :id""")
                .param("id", id)
                .query((rs, i) -> new DesignView(rs.getObject("id", UUID.class), rs.getString("slug"),
                        rs.getString("color_code"), rs.getString("size_code"), rs.getString("name"),
                        jsonMapper.readTree(rs.getString("document")), rs.getLong("version"),
                        rs.getTimestamp("updated_at").toInstant(), warnings))
                .single();
    }

    private static String newToken() {
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
