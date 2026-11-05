package com.musfyr.print.commerce;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.musfyr.print.common.error.BusinessRuleException;

/** Read access to the catalogue data that prices depend on. */
@Repository
public class CommerceRepository {

    private final JdbcClient jdbc;

    public CommerceRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record VariantInfo(UUID variantId, UUID productId, String productSlug, String productName, String garmentType,
                              String sku, String colorCode, String colorName, String colorHex, String sizeCode,
                              long priceMinor, String currency, int stock, boolean trackInventory, boolean available,
                              boolean customizable) {
    }

    public Optional<VariantInfo> variant(UUID variantId, String lang) {
        return jdbc.sql("""
                SELECT v.id, p.id AS product_id, p.slug, COALESCE(p.i18n -> :lang ->> 'name', p.name) AS name, p.garment_type,
                       v.sku, c.code AS color_code, COALESCE(c.i18n -> :lang ->> 'name', c.name) AS color_name, c.hex,
                       v.size_code, COALESCE(v.price_minor, p.base_price_minor) AS price, p.currency, v.stock_quantity,
                       v.track_inventory, (v.active AND p.status = 'ACTIVE') AS available, p.customizable
                FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN colors c ON c.id = v.color_id
                WHERE v.id = :id""")
                .param("id", variantId).param("lang", lang)
                .query((rs, i) -> new VariantInfo(rs.getObject("id", UUID.class), rs.getObject("product_id", UUID.class),
                        rs.getString("slug"), rs.getString("name"), rs.getString("garment_type"), rs.getString("sku"),
                        rs.getString("color_code"), rs.getString("color_name"), rs.getString("hex"), rs.getString("size_code"),
                        rs.getLong("price"), rs.getString("currency"), rs.getInt("stock_quantity"),
                        rs.getBoolean("track_inventory"), rs.getBoolean("available"), rs.getBoolean("customizable")))
                .optional();
    }

    public Optional<UUID> variantFor(String productSlug, String colorCode, String sizeCode) {
        return jdbc.sql("""
                SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN colors c ON c.id = v.color_id
                WHERE p.slug = :slug AND v.size_code = :size AND (c.code = :color OR (:color IS NULL AND v.color_id IS NULL))""")
                .param("slug", productSlug).param("size", sizeCode).param("color", colorCode)
                .query(UUID.class).optional();
    }

    /** Validates chosen option values (every required group answered, no unknown codes) and sums their surcharges. */
    public long optionsSurcharge(UUID productId, Map<String, String> chosen) {
        record Value(String group, boolean required, String code, long delta) {
        }
        List<Value> values = jdbc.sql("""
                SELECT g.code AS g, g.required, v.code AS v, v.price_delta_minor
                FROM product_option_groups g JOIN product_option_values v ON v.group_id = g.id WHERE g.product_id = :p""")
                .param("p", productId)
                .query((rs, i) -> new Value(rs.getString("g"), rs.getBoolean("required"), rs.getString("v"), rs.getLong("price_delta_minor")))
                .list();
        long total = 0;
        for (Map.Entry<String, String> e : chosen.entrySet()) {
            Value v = values.stream().filter(x -> x.group().equals(e.getKey()) && x.code().equals(e.getValue())).findFirst()
                    .orElseThrow(() -> new BusinessRuleException("Unknown option " + e.getKey() + "=" + e.getValue()));
            total += v.delta();
        }
        boolean missing = values.stream().filter(Value::required).map(Value::group).distinct().anyMatch(g -> !chosen.containsKey(g));
        if (missing) {
            throw new BusinessRuleException("Please choose all required options");
        }
        return total;
    }

    public long defaultPrintMethodSurcharge(UUID productId) {
        return jdbc.sql("SELECT COALESCE(MAX(price_delta_minor), 0) FROM product_print_methods WHERE product_id = :p AND is_default")
                .param("p", productId).query(Long.class).single();
    }

    public long printAreaFees(UUID productId, List<String> zones) {
        if (zones.isEmpty()) {
            return 0;
        }
        return jdbc.sql("SELECT COALESCE(SUM(price_delta_minor), 0) FROM print_areas WHERE product_id = :p AND code IN (:zones)")
                .param("p", productId).param("zones", zones).query(Long.class).single();
    }

    public List<PriceCalculator.Tier> tiers() {
        return jdbc.sql("SELECT min_quantity, percent FROM quantity_discount_tiers ORDER BY min_quantity")
                .query((rs, i) -> new PriceCalculator.Tier(rs.getInt(1), rs.getInt(2))).list();
    }

    public record ShippingMethod(String code, String name, String carrier, long priceMinor, String currency,
                                 boolean requiresPickupPoint, int daysMin, int daysMax) {
    }

    public List<ShippingMethod> shippingMethods(String lang) {
        return jdbc.sql("""
                SELECT code, COALESCE(i18n -> :lang ->> 'name', name) AS name, carrier, price_minor, currency,
                       requires_pickup_point, days_min, days_max
                FROM shipping_methods WHERE active ORDER BY sort_order""")
                .param("lang", lang)
                .query((rs, i) -> new ShippingMethod(rs.getString("code"), rs.getString("name"), rs.getString("carrier"),
                        rs.getLong("price_minor"), rs.getString("currency"), rs.getBoolean("requires_pickup_point"),
                        rs.getInt("days_min"), rs.getInt("days_max")))
                .list();
    }

    public Optional<PriceCalculator.Promotion> promotion(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return jdbc.sql("""
                SELECT code, discount_type, discount_value, min_order_minor, starts_at, ends_at, active, max_redemptions, redemptions
                FROM promotions WHERE upper(code) = upper(:code)""")
                .param("code", code.trim())
                .query((rs, i) -> new PriceCalculator.Promotion(rs.getString("code"), rs.getString("discount_type"),
                        rs.getLong("discount_value"), rs.getLong("min_order_minor"), instant(rs.getTimestamp("starts_at")),
                        instant(rs.getTimestamp("ends_at")), rs.getBoolean("active"), rs.getObject("max_redemptions", Integer.class),
                        rs.getInt("redemptions")))
                .optional();
    }

    private static Instant instant(java.sql.Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
