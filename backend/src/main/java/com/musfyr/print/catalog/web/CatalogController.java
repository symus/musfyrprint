package com.musfyr.print.catalog.web;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.catalog.dto.CatalogDtos.CategoryView;
import com.musfyr.print.catalog.dto.CatalogDtos.CollectionView;
import com.musfyr.print.catalog.dto.CatalogDtos.Facets;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductDetail;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductSummary;
import com.musfyr.print.catalog.dto.CatalogDtos.Suggestion;
import com.musfyr.print.catalog.service.CatalogQueryService;
import com.musfyr.print.catalog.service.ProductDetailService;
import com.musfyr.print.catalog.service.ProductSearchCriteria;
import com.musfyr.print.common.web.PageResponse;

@RestController
@RequestMapping("/api/v1/catalog")
@Tag(name = "Catalogue")
@Validated
public class CatalogController {

    private static final String SLUG = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
    private static final String CODE = "^[A-Za-z_]{1,20}$";

    private final CatalogQueryService queries;
    private final ProductDetailService details;

    public CatalogController(CatalogQueryService queries, ProductDetailService details) {
        this.queries = queries;
        this.details = details;
    }

    @GetMapping("/products")
    @Operation(summary = "Search and filter active products",
            description = "Example: /api/v1/catalog/products?category=t-shirts&color=black&sort=PRICE_ASC&page=0&size=24")
    public PageResponse<ProductSummary> products(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Pattern(regexp = SLUG) String category,
            @RequestParam(required = false) @Pattern(regexp = SLUG) String collection,
            @RequestParam(required = false) @Pattern(regexp = CODE) String family,
            @RequestParam(required = false) @Pattern(regexp = CODE) String ageGroup,
            @RequestParam(required = false) @Pattern(regexp = CODE) String gender,
            @RequestParam(required = false) @Pattern(regexp = CODE) String fit,
            @RequestParam(name = "color", required = false) @Size(max = 10) List<@Pattern(regexp = SLUG) String> colors,
            @RequestParam(required = false) @Min(0) Long minPrice,
            @RequestParam(required = false) @Min(0) Long maxPrice,
            @RequestParam(required = false) @Pattern(regexp = SLUG) String tag,
            @RequestParam(required = false) Boolean customizable,
            @RequestParam(defaultValue = "FEATURED") ProductSearchCriteria.Sort sort,
            @RequestParam(defaultValue = "0") @Min(0) @Max(500) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(60) int size) {
        return queries.search(new ProductSearchCriteria(q, category, collection, family, ageGroup, gender, fit,
                colors == null ? List.of() : colors, minPrice, maxPrice, tag, customizable, sort, page, size, null));
    }

    @GetMapping("/products/{slug}")
    @Operation(summary = "Product detail with variants, options, print areas and methods")
    public ResponseEntity<ProductDetail> product(@PathVariable @Pattern(regexp = SLUG) String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(details.bySlug(slug));
    }

    @GetMapping("/products/{slug}/related")
    @Operation(summary = "Popular products from the same category")
    public List<ProductSummary> related(@PathVariable @Pattern(regexp = SLUG) String slug,
                                        @RequestParam(defaultValue = "4") @Min(1) @Max(12) int size) {
        ProductDetail product = details.bySlug(slug);
        String categorySlug = product.breadcrumbs().getLast().slug();
        return queries.search(ProductSearchCriteria.simple(ProductSearchCriteria.Sort.POPULAR, size)
                .relatedTo(categorySlug, slug)).items();
    }

    @GetMapping("/categories")
    @Operation(summary = "Active categories with product counts")
    public List<CategoryView> categories() {
        return queries.categories();
    }

    @GetMapping("/categories/{slug}")
    public CategoryView category(@PathVariable @Pattern(regexp = SLUG) String slug) {
        return queries.category(slug);
    }

    @GetMapping("/collections")
    @Operation(summary = "Curated collections (gifts, family matching, business, ...)")
    public List<CollectionView> collections() {
        return queries.collections();
    }

    @GetMapping("/collections/{slug}")
    public CollectionView collection(@PathVariable @Pattern(regexp = SLUG) String slug) {
        return queries.collection(slug);
    }

    @GetMapping("/facets")
    @Operation(summary = "Filter options derived from the active catalogue")
    public Facets facets() {
        return queries.facets();
    }

    @GetMapping("/suggest")
    @Operation(summary = "Search autocomplete")
    public List<Suggestion> suggest(@RequestParam @Size(min = 2, max = 60) String q,
                                    @RequestParam(defaultValue = "6") @Min(1) @Max(10) int limit) {
        return queries.suggest(q, limit);
    }
}
