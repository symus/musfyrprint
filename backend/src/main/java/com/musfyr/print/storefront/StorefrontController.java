package com.musfyr.print.storefront;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.catalog.dto.CatalogDtos.CategoryView;
import com.musfyr.print.catalog.dto.CatalogDtos.CollectionView;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductSummary;
import com.musfyr.print.catalog.service.CatalogQueryService;
import com.musfyr.print.catalog.service.ProductSearchCriteria;
import com.musfyr.print.catalog.service.ProductSearchCriteria.Sort;
import com.musfyr.print.common.i18n.ContentLanguage;
import com.musfyr.print.marketing.PromotionQueries;
import com.musfyr.print.reviews.ReviewQueries;

@RestController
@RequestMapping("/api/v1/storefront")
@Tag(name = "Storefront")
public class StorefrontController {

    private final CatalogQueryService catalog;
    private final PromotionQueries promotions;
    private final ReviewQueries reviews;
    private final ContentLanguage language;

    public StorefrontController(CatalogQueryService catalog, PromotionQueries promotions, ReviewQueries reviews,
                                ContentLanguage language) {
        this.catalog = catalog;
        this.promotions = promotions;
        this.reviews = reviews;
        this.language = language;
    }

    @GetMapping("/home")
    @Operation(summary = "Everything the homepage needs in one round trip")
    public HomePage home() {
        String lang = language.current();
        return new HomePage(
                catalog.search(ProductSearchCriteria.simple(Sort.FEATURED, 8), lang).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.NEWEST, 8), lang).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 8), lang).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4).withTag("baby"), lang).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4)
                        .withCollection("family-matching"), lang).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4).withTag("business"), lang).items(),
                catalog.categories(lang),
                catalog.collections(lang),
                promotions.activeBanners(lang),
                reviews.featured(6));
    }

    public record HomePage(List<ProductSummary> featured, List<ProductSummary> newArrivals,
                           List<ProductSummary> trending, List<ProductSummary> baby,
                           List<ProductSummary> familyMatching, List<ProductSummary> business,
                           List<CategoryView> categories, List<CollectionView> collections,
                           List<PromotionQueries.PromotionView> promotions, List<ReviewQueries.ReviewView> reviews) {
    }
}
