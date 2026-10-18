package com.musfyr.print.catalog.service;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.musfyr.print.catalog.dto.CatalogDtos.CategoryView;
import com.musfyr.print.catalog.dto.CatalogDtos.CollectionView;
import com.musfyr.print.catalog.dto.CatalogDtos.ColorView;
import com.musfyr.print.catalog.dto.CatalogDtos.FacetCount;
import com.musfyr.print.catalog.dto.CatalogDtos.Facets;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductSummary;
import com.musfyr.print.catalog.dto.CatalogDtos.Suggestion;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.web.Money;
import com.musfyr.print.common.web.PageResponse;
import com.musfyr.print.config.AppProperties;

/**
 * Read model for the storefront. Uses hand-written SQL (PostgreSQL full-text search, trigram similarity,
 * window-free counting) instead of JPA because listing queries are the hottest path in the shop.
 */
@Service
@Transactional(readOnly = true)
public class CatalogQueryService {

    public static final String CACHE_CATEGORIES = "catalog-categories";
    public static final String CACHE_COLLECTIONS = "catalog-collections";
    public static final String CACHE_FACETS = "catalog-facets";
    private static final Duration NEW_ARRIVAL_WINDOW = Duration.ofDays(21);

    private final JdbcClient jdbc;
    private final String defaultCurrency;

    public CatalogQueryService(JdbcClient jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.defaultCurrency = props.commerce().defaultCurrency();
    }

    public PageResponse<ProductSummary> search(ProductSearchCriteria c) {
        Map<String, Object> params = new LinkedHashMap<>();
        StringBuilder where = new StringBuilder("p.status = 'ACTIVE' AND cat.active");
        String tsQuery = SearchQueries.prefixTsQuery(c.q());

        if (StringUtils.hasText(c.q())) {
            params.put("q", c.q().trim());
            params.put("like", SearchQueries.likePattern(c.q()));
            where.append(" AND (p.name ILIKE :like OR similarity(p.name, :q) > 0.25 OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE :like)");
            if (tsQuery != null) {
                params.put("tsq", tsQuery);
                where.append(" OR p.search_vector @@ to_tsquery('simple', :tsq)");
            }
            where.append(')');
        }
        if (StringUtils.hasText(c.category())) {
            params.put("category", c.category());
            where.append(" AND (cat.slug = :category OR cat.parent_id = (SELECT id FROM categories WHERE slug = :category))");
        }
        if (StringUtils.hasText(c.collection())) {
            params.put("collection", c.collection());
            where.append(" AND EXISTS (SELECT 1 FROM collection_products cp JOIN collections col ON col.id = cp.collection_id"
                    + " WHERE cp.product_id = p.id AND col.slug = :collection AND col.active)");
        }
        addEquals(where, params, "p.product_family", "family", c.family());
        addEquals(where, params, "p.age_group", "ageGroup", c.ageGroup());
        addEquals(where, params, "p.gender", "gender", c.gender());
        addEquals(where, params, "p.fit", "fit", c.fit());
        if (c.colors() != null && !c.colors().isEmpty()) {
            params.put("colors", c.colors());
            where.append(" AND EXISTS (SELECT 1 FROM product_colors pc JOIN colors co ON co.id = pc.color_id"
                    + " WHERE pc.product_id = p.id AND co.code IN (:colors))");
        }
        if (c.minPrice() != null) {
            params.put("minPrice", c.minPrice());
            where.append(" AND p.base_price_minor >= :minPrice");
        }
        if (c.maxPrice() != null) {
            params.put("maxPrice", c.maxPrice());
            where.append(" AND p.base_price_minor <= :maxPrice");
        }
        if (StringUtils.hasText(c.tag())) {
            params.put("tag", c.tag().toLowerCase());
            where.append(" AND :tag = ANY (p.tags)");
        }
        if (c.customizable() != null) {
            params.put("customizable", c.customizable());
            where.append(" AND p.customizable = :customizable");
        }
        if (StringUtils.hasText(c.excludeSlug())) {
            params.put("excludeSlug", c.excludeSlug());
            where.append(" AND p.slug <> :excludeSlug");
        }

        String orderBy;
        if (c.sort() == ProductSearchCriteria.Sort.RELEVANCE && params.containsKey("q")) {
            orderBy = (tsQuery != null ? "ts_rank(p.search_vector, to_tsquery('simple', :tsq)) DESC, " : "")
                    + "similarity(p.name, :q) DESC";
        } else {
            orderBy = (c.sort() == null || c.sort().orderBy == null ? ProductSearchCriteria.Sort.FEATURED : c.sort()).orderBy;
        }

        long total = bind(jdbc.sql("SELECT count(*) FROM products p JOIN categories cat ON cat.id = p.category_id WHERE "
                + where), params).query(Long.class).single();

        params.put("limit", c.size());
        params.put("offset", (long) c.page() * c.size());
        List<ProductSummary> items = total == 0 ? List.of() : withColors(bind(jdbc.sql(SUMMARY_SELECT + " WHERE " + where
                + " ORDER BY " + orderBy + ", p.id LIMIT :limit OFFSET :offset"), params)
                .query(this::mapSummary).list());
        return PageResponse.of(items, c.page(), c.size(), total);
    }

    @Cacheable(CACHE_CATEGORIES)
    public List<CategoryView> categories() {
        return jdbc.sql("""
                SELECT c.id, c.slug, c.name, c.description, c.product_family, c.accent_hex, parent.slug AS parent_slug,
                       (SELECT count(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE') AS product_count
                FROM categories c LEFT JOIN categories parent ON parent.id = c.parent_id
                WHERE c.active ORDER BY c.sort_order, c.name""")
                .query((rs, i) -> new CategoryView(rs.getObject("id", UUID.class), rs.getString("slug"),
                        rs.getString("name"), rs.getString("description"), rs.getString("product_family"),
                        rs.getString("accent_hex"), rs.getString("parent_slug"), rs.getLong("product_count")))
                .list();
    }

    public CategoryView category(String slug) {
        return categories().stream().filter(c -> c.slug().equals(slug)).findFirst()
                .orElseThrow(() -> new NotFoundException("Category", slug));
    }

    @Cacheable(CACHE_COLLECTIONS)
    public List<CollectionView> collections() {
        return jdbc.sql("""
                SELECT col.id, col.slug, col.name, col.description, col.kind, col.accent_hex,
                       (SELECT count(*) FROM collection_products cp JOIN products p ON p.id = cp.product_id
                        WHERE cp.collection_id = col.id AND p.status = 'ACTIVE') AS product_count
                FROM collections col WHERE col.active ORDER BY col.sort_order, col.name""")
                .query((rs, i) -> new CollectionView(rs.getObject("id", UUID.class), rs.getString("slug"),
                        rs.getString("name"), rs.getString("description"), rs.getString("kind"),
                        rs.getString("accent_hex"), rs.getLong("product_count")))
                .list();
    }

    public CollectionView collection(String slug) {
        return collections().stream().filter(c -> c.slug().equals(slug)).findFirst()
                .orElseThrow(() -> new NotFoundException("Collection", slug));
    }

    @Cacheable(CACHE_FACETS)
    public Facets facets() {
        List<ColorView> colors = jdbc.sql("""
                SELECT DISTINCT co.code, co.name, co.hex, co.sort_order FROM colors co
                JOIN product_colors pc ON pc.color_id = co.id JOIN products p ON p.id = pc.product_id
                WHERE p.status = 'ACTIVE' ORDER BY co.sort_order""")
                .query((rs, i) -> new ColorView(rs.getString("code"), rs.getString("name"), rs.getString("hex")))
                .list();
        Map<String, Object> range = jdbc.sql("SELECT min(base_price_minor) AS lo, max(base_price_minor) AS hi"
                + " FROM products WHERE status = 'ACTIVE'").query().singleRow();
        return new Facets(colors, countBy("product_family"), countBy("age_group"), countBy("gender"), countBy("fit"),
                money(range.get("lo")), money(range.get("hi")));
    }

    /** Type-ahead suggestions for products and categories; tolerant to typos via trigram similarity. */
    public List<Suggestion> suggest(String q, int limit) {
        String tsQuery = SearchQueries.prefixTsQuery(q);
        if (tsQuery == null) {
            return List.of();
        }
        List<Suggestion> results = new ArrayList<>(jdbc.sql("""
                SELECT p.slug, p.name, cat.name AS category FROM products p JOIN categories cat ON cat.id = p.category_id
                WHERE p.status = 'ACTIVE'
                  AND (p.search_vector @@ to_tsquery('simple', :tsq) OR similarity(p.name, :q) > 0.2)
                ORDER BY similarity(p.name, :q) DESC, p.rating_count DESC LIMIT :limit""")
                .param("tsq", tsQuery).param("q", q.trim()).param("limit", limit)
                .query((rs, i) -> new Suggestion("PRODUCT", rs.getString("slug"), rs.getString("name"),
                        rs.getString("category")))
                .list());
        results.addAll(jdbc.sql("""
                SELECT slug, name FROM categories WHERE active AND (name ILIKE :like OR similarity(name, :q) > 0.3)
                ORDER BY similarity(name, :q) DESC LIMIT 3""")
                .param("like", SearchQueries.likePattern(q)).param("q", q.trim())
                .query((rs, i) -> new Suggestion("CATEGORY", rs.getString("slug"), rs.getString("name"), null))
                .list());
        return results;
    }

    // -----------------------------------------------------------------------------------------------------------

    private static final String SUMMARY_SELECT = """
            SELECT p.id, p.slug, p.name, p.short_description, cat.slug AS category_slug, cat.name AS category_name,
                   p.product_family, p.garment_type, p.age_group, p.gender, p.fit, p.base_price_minor,
                   p.compare_at_minor, p.currency, p.featured, p.customizable, p.rating_avg, p.rating_count, p.tags,
                   p.created_at,
                   COALESCE((SELECT min(COALESCE(v.price_minor, p.base_price_minor)) FROM product_variants v
                             WHERE v.product_id = p.id AND v.active), p.base_price_minor) AS price_from,
                   EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.active
                           AND (NOT v.track_inventory OR v.stock_quantity > 0)) AS in_stock
            FROM products p JOIN categories cat ON cat.id = p.category_id""";

    private ProductSummary mapSummary(ResultSet rs, int rowNum) throws SQLException {
        String currency = rs.getString("currency");
        Long compareAt = rs.getObject("compare_at_minor", Long.class);
        Instant createdAt = rs.getTimestamp("created_at").toInstant();
        return new ProductSummary(rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("name"),
                rs.getString("short_description"), rs.getString("category_slug"), rs.getString("category_name"),
                rs.getString("product_family"), rs.getString("garment_type"), rs.getString("age_group"),
                rs.getString("gender"), rs.getString("fit"), new Money(rs.getLong("price_from"), currency),
                compareAt == null ? null : new Money(compareAt, currency), rs.getBoolean("featured"),
                rs.getBoolean("customizable"), createdAt.isAfter(Instant.now().minus(NEW_ARRIVAL_WINDOW)),
                rs.getBoolean("in_stock"), rs.getBigDecimal("rating_avg"), rs.getInt("rating_count"),
                textArray(rs.getArray("tags")), List.of());
    }

    private List<ProductSummary> withColors(List<ProductSummary> items) {
        if (items.isEmpty()) {
            return items;
        }
        Collection<UUID> ids = items.stream().map(ProductSummary::id).toList();
        Map<UUID, List<ColorView>> byProduct = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT pc.product_id, co.code, co.name, co.hex FROM product_colors pc JOIN colors co ON co.id = pc.color_id
                WHERE pc.product_id IN (:ids) ORDER BY co.sort_order""")
                .param("ids", ids)
                .query(rs -> {
                    byProduct.computeIfAbsent(rs.getObject("product_id", UUID.class), k -> new ArrayList<>())
                            .add(new ColorView(rs.getString("code"), rs.getString("name"), rs.getString("hex")));
                });
        return items.stream().map(p -> new ProductSummary(p.id(), p.slug(), p.name(), p.shortDescription(),
                p.categorySlug(), p.categoryName(), p.productFamily(), p.garmentType(), p.ageGroup(), p.gender(),
                p.fit(), p.priceFrom(), p.compareAt(), p.featured(), p.customizable(), p.isNew(), p.inStock(),
                p.ratingAvg(), p.ratingCount(), p.tags(), byProduct.getOrDefault(p.id(), List.of()))).toList();
    }

    private List<FacetCount> countBy(String column) {
        // column is one of a fixed set of internal identifiers, never user input
        return jdbc.sql("SELECT " + column + " AS value, count(*) AS cnt FROM products WHERE status = 'ACTIVE'"
                        + " GROUP BY " + column + " ORDER BY cnt DESC")
                .query((rs, i) -> new FacetCount(rs.getString("value"), rs.getLong("cnt"))).list();
    }

    private Money money(Object minor) {
        return minor == null ? null : new Money(((Number) minor).longValue(), defaultCurrency);
    }

    private static void addEquals(StringBuilder where, Map<String, Object> params, String column, String name,
                                  String value) {
        if (StringUtils.hasText(value)) {
            params.put(name, value.toUpperCase());
            where.append(" AND ").append(column).append(" = :").append(name);
        }
    }

    private static JdbcClient.StatementSpec bind(JdbcClient.StatementSpec spec, Map<String, Object> params) {
        return spec.params(params);
    }

    private static List<String> textArray(Array array) throws SQLException {
        return array == null ? List.of() : List.of((String[]) array.getArray());
    }
}
