package com.musfyr.print.reviews;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read side for moderated reviews. Only APPROVED reviews are ever exposed. Submission and moderation are part
 * of the Phase 4 reviews module (verified-purchase checks need orders).
 */
@Service
public class ReviewQueries {

    private final JdbcClient jdbc;

    public ReviewQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<ReviewView> featured(int limit) {
        return jdbc.sql("""
                SELECT r.id, r.author_name, r.rating, r.title, r.body, r.verified_purchase, r.created_at,
                       p.slug AS product_slug, p.name AS product_name
                FROM product_reviews r JOIN products p ON p.id = r.product_id
                WHERE r.status = 'APPROVED' AND r.rating >= 4
                ORDER BY r.created_at DESC LIMIT :limit""")
                .param("limit", limit).query(this::map).list();
    }

    public List<ReviewView> forProduct(String slug, int limit) {
        return jdbc.sql("""
                SELECT r.id, r.author_name, r.rating, r.title, r.body, r.verified_purchase, r.created_at,
                       p.slug AS product_slug, p.name AS product_name
                FROM product_reviews r JOIN products p ON p.id = r.product_id
                WHERE r.status = 'APPROVED' AND p.slug = :slug
                ORDER BY r.created_at DESC LIMIT :limit""")
                .param("slug", slug).param("limit", limit).query(this::map).list();
    }

    private ReviewView map(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new ReviewView(rs.getObject("id", UUID.class), rs.getString("author_name"), rs.getInt("rating"),
                rs.getString("title"), rs.getString("body"), rs.getBoolean("verified_purchase"),
                rs.getTimestamp("created_at").toInstant(), rs.getString("product_slug"), rs.getString("product_name"));
    }

    public record ReviewView(UUID id, String authorName, int rating, String title, String body,
                             boolean verifiedPurchase, Instant createdAt, String productSlug, String productName) {
    }

    @RestController
    @RequestMapping("/api/v1/catalog/products/{slug}/reviews")
    @Tag(name = "Reviews")
    static class ReviewController {

        private final ReviewQueries reviews;

        ReviewController(ReviewQueries reviews) {
            this.reviews = reviews;
        }

        @GetMapping
        @Operation(summary = "Approved reviews for a product")
        public List<ReviewView> list(@PathVariable String slug) {
            return reviews.forProduct(slug, 20);
        }
    }
}
