package com.musfyr.print.catalog.service;

import java.util.List;

/**
 * Validated storefront listing criteria. All values arrive from query parameters and are bound as SQL
 * parameters; nothing is concatenated into SQL except whitelisted sort expressions.
 */
public record ProductSearchCriteria(String q, String category, String collection, String family, String ageGroup,
                                    String gender, String fit, List<String> colors, Long minPrice, Long maxPrice,
                                    String tag, Boolean customizable, Sort sort, int page, int size,
                                    String excludeSlug) {

    public enum Sort {
        FEATURED("p.featured DESC, p.rating_count DESC, p.created_at DESC"),
        NEWEST("p.created_at DESC"),
        PRICE_ASC("price_from ASC"),
        PRICE_DESC("price_from DESC"),
        RATING("p.rating_avg DESC, p.rating_count DESC"),
        POPULAR("p.rating_count DESC"),
        RELEVANCE(null);

        final String orderBy;

        Sort(String orderBy) {
            this.orderBy = orderBy;
        }
    }

    public static ProductSearchCriteria simple(Sort sort, int size) {
        return new ProductSearchCriteria(null, null, null, null, null, null, null, List.of(), null, null, null, null,
                sort, 0, size, null);
    }

    public ProductSearchCriteria withCollection(String slug) {
        return new ProductSearchCriteria(q, category, slug, family, ageGroup, gender, fit, colors, minPrice, maxPrice,
                tag, customizable, sort, page, size, excludeSlug);
    }

    public ProductSearchCriteria withTag(String value) {
        return new ProductSearchCriteria(q, category, collection, family, ageGroup, gender, fit, colors, minPrice,
                maxPrice, value, customizable, sort, page, size, excludeSlug);
    }

    public ProductSearchCriteria relatedTo(String categorySlug, String slug) {
        return new ProductSearchCriteria(null, categorySlug, null, null, null, null, null, List.of(), null, null,
                null, null, Sort.POPULAR, 0, size, slug);
    }
}
