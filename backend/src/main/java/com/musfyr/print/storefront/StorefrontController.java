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
import com.musfyr.print.marketing.PromotionQueries;
import com.musfyr.print.reviews.ReviewQueries;

@RestController
@RequestMapping("/api/v1/storefront")
@Tag(name = "Storefront")
public class StorefrontController {

    private final CatalogQueryService catalog;
    private final PromotionQueries promotions;
    private final ReviewQueries reviews;

    public StorefrontController(CatalogQueryService catalog, PromotionQueries promotions, ReviewQueries reviews) {
        this.catalog = catalog;
        this.promotions = promotions;
        this.reviews = reviews;
    }

    @GetMapping("/home")
    @Operation(summary = "Everything the homepage needs in one round trip")
    public HomePage home() {
        return new HomePage(
                catalog.search(ProductSearchCriteria.simple(Sort.FEATURED, 8)).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.NEWEST, 8)).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 8)).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4).withTag("baby")).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4)
                        .withCollection("family-matching")).items(),
                catalog.search(ProductSearchCriteria.simple(Sort.POPULAR, 4).withTag("business")).items(),
                catalog.categories(),
                catalog.collections(),
                promotions.activeBanners(),
                reviews.featured(6));
    }

    public record HomePage(List<ProductSummary> featured, List<ProductSummary> newArrivals,
                           List<ProductSummary> trending, List<ProductSummary> baby,
                           List<ProductSummary> familyMatching, List<ProductSummary> business,
                           List<CategoryView> categories, List<CollectionView> collections,
                           List<PromotionQueries.PromotionView> promotions, List<ReviewQueries.ReviewView> reviews) {
    }
}
