package com.musfyr.print.catalog.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.musfyr.print.common.web.Money;

/** Public, read-only catalogue representations. Exact stock counts are never exposed publicly. */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record ColorView(String code, String name, String hex) {
    }

    public record ProductSummary(UUID id, String slug, String name, String shortDescription, String categorySlug,
                                 String categoryName, String productFamily, String garmentType, String ageGroup,
                                 String gender, String fit, Money priceFrom, Money compareAt, boolean featured,
                                 boolean customizable, boolean isNew, boolean inStock, BigDecimal ratingAvg,
                                 int ratingCount, List<String> tags, List<ColorView> colors) {
    }

    public record CategoryView(UUID id, String slug, String name, String description, String productFamily,
                               String accentHex, String parentSlug, long productCount) {
    }

    public record CollectionView(UUID id, String slug, String name, String description, String kind,
                                 String accentHex, long productCount) {
    }

    public record VariantView(UUID id, String sku, String colorCode, String sizeCode, Money price,
                              String availability) {
    }

    public record SizeView(String code, boolean available) {
    }

    public record OptionValueView(String code, String label, long priceDeltaMinor) {
    }

    public record OptionGroupView(String code, String name, boolean required, List<OptionValueView> values) {
    }

    public record PrintAreaView(String code, String name, int widthMm, int heightMm, int safeMarginMm, int minDpi,
                                long priceDeltaMinor) {
    }

    public record PrintMethodView(String code, String name, String description, long priceDeltaMinor,
                                  boolean isDefault) {
    }

    public record ImageView(String url, String altText, String colorCode) {
    }

    public record Breadcrumb(String slug, String name) {
    }

    public record ProductionTime(int minDays, int maxDays) {
    }

    public record ProductDetail(UUID id, String slug, String name, String shortDescription, String description,
                                String productFamily, String garmentType, String ageGroup, String gender, String fit,
                                String material, Money priceFrom, Money basePrice, Money compareAt,
                                boolean customizable, boolean featured, BigDecimal ratingAvg, int ratingCount,
                                List<String> tags, String modelKey, ProductionTime productionTime,
                                List<Breadcrumb> breadcrumbs, List<ColorView> colors, List<SizeView> sizes,
                                List<VariantView> variants, List<OptionGroupView> optionGroups,
                                List<PrintAreaView> printAreas, List<PrintMethodView> printMethods,
                                List<ImageView> images) {
    }

    public record FacetCount(String value, long count) {
    }

    public record Facets(List<ColorView> colors, List<FacetCount> families, List<FacetCount> ageGroups,
                         List<FacetCount> genders, List<FacetCount> fits, Money minPrice, Money maxPrice) {
    }

    public record Suggestion(String type, String slug, String label, String context) {
    }
}
