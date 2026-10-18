package com.musfyr.print.marketing;

import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class PromotionQueries {

    private final JdbcClient jdbc;

    public PromotionQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PromotionView> activeBanners(String lang) {
        return jdbc.sql("""
                SELECT code, COALESCE(i18n -> :lang ->> 'title', title) AS title,
                       COALESCE(i18n -> :lang ->> 'description', description) AS description, discount_type, discount_value, min_order_minor, currency, ends_at
                FROM promotions
                WHERE active AND public_banner
                  AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())
                ORDER BY created_at DESC LIMIT 5""")
                .param("lang", lang)
                .query((rs, i) -> new PromotionView(rs.getString("code"), rs.getString("title"),
                        rs.getString("description"), rs.getString("discount_type"), rs.getLong("discount_value"),
                        rs.getLong("min_order_minor"), rs.getString("currency"),
                        rs.getTimestamp("ends_at") == null ? null : rs.getTimestamp("ends_at").toInstant()))
                .list();
    }

    public record PromotionView(String code, String title, String description, String discountType,
                                long discountValue, long minOrderMinor, String currency, Instant endsAt) {
    }
}
