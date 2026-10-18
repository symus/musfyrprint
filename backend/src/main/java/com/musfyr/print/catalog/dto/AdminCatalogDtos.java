package com.musfyr.print.catalog.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.musfyr.print.catalog.domain.AgeGroup;
import com.musfyr.print.catalog.domain.Fit;
import com.musfyr.print.catalog.domain.GarmentType;
import com.musfyr.print.catalog.domain.Gender;
import com.musfyr.print.catalog.domain.ProductFamily;
import com.musfyr.print.catalog.domain.ProductStatus;
import com.musfyr.print.catalog.dto.CatalogDtos.ColorView;
import com.musfyr.print.common.web.Money;

public final class AdminCatalogDtos {

    public static final String SLUG = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
    public static final String HEX = "^#[0-9A-Fa-f]{6}$";

    private AdminCatalogDtos() {
    }

    public record ProductUpsertRequest(
            @NotNull UUID categoryId,
            @NotBlank @Size(max = 120) @Pattern(regexp = SLUG, message = "must be lowercase words separated by hyphens") String slug,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 300) String shortDescription,
            @Size(max = 5000) String description,
            @NotNull ProductFamily productFamily,
            GarmentType garmentType,
            AgeGroup ageGroup,
            Gender gender,
            Fit fit,
            @Size(max = 200) String material,
            @NotNull @Min(0) @Max(100_000_00) Long basePriceMinor,
            @Min(0) Long compareAtMinor,
            @Pattern(regexp = "^[A-Z]{3}$") String currency,
            @Min(0) @Max(60) Integer productionDaysMin,
            @Min(0) @Max(60) Integer productionDaysMax,
            boolean customizable,
            boolean featured,
            @Size(max = 20) List<@Pattern(regexp = SLUG) String> tags,
            @Size(max = 80) @Pattern(regexp = "^[a-z0-9_-]*$") String modelKey,
            @Size(max = 40) List<@Pattern(regexp = SLUG) String> colorCodes,
            Long version) {

        @AssertTrue(message = "productionDaysMin must not exceed productionDaysMax")
        public boolean isProductionRangeValid() {
            return productionDaysMin == null || productionDaysMax == null || productionDaysMin <= productionDaysMax;
        }
    }

    public record StatusChangeRequest(@NotNull ProductStatus status) {
    }

    public record GenerateVariantsRequest(
            @Size(max = 40) List<@Pattern(regexp = SLUG) String> colorCodes,
            @NotEmpty @Size(max = 30) List<@NotBlank @Size(max = 30) @Pattern(regexp = "^[A-Za-z0-9.\\-_x]+$") String> sizeCodes,
            @Min(0) @Max(1_000_000) int initialStock,
            @NotBlank @Pattern(regexp = "^[A-Z0-9]{2,10}$") String skuPrefix) {
    }

    public record VariantUpdateRequest(@Min(0) Long priceMinor, @Min(0) @Max(1_000_000) int stockQuantity,
                                       boolean trackInventory, boolean active, @NotNull Long version) {
    }

    public record AdminProductRow(UUID id, String slug, String name, String categoryName, String productFamily,
                                  String status, Money basePrice, boolean featured, int variantCount, long totalStock,
                                  Instant updatedAt) {
    }

    public record AdminVariant(UUID id, String sku, String colorCode, String sizeCode, Long priceMinor,
                               long effectivePriceMinor, int stockQuantity, boolean trackInventory, boolean active,
                               String availability, long version) {
    }

    public record AdminProductDetail(UUID id, UUID categoryId, String slug, String name, String shortDescription,
                                     String description, ProductFamily productFamily, GarmentType garmentType,
                                     AgeGroup ageGroup, Gender gender, Fit fit, String material, long basePriceMinor,
                                     Long compareAtMinor, String currency, int productionDaysMin,
                                     int productionDaysMax, boolean customizable, boolean featured,
                                     ProductStatus status, List<String> tags, String modelKey, List<ColorView> colors,
                                     List<AdminVariant> variants, long version, Instant createdAt,
                                     Instant updatedAt) {
    }

    public record CategoryUpsertRequest(
            @NotBlank @Size(max = 80) @Pattern(regexp = SLUG) String slug,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 2000) String description,
            @NotNull ProductFamily productFamily,
            @Pattern(regexp = HEX) String accentHex,
            UUID parentId,
            @Min(0) @Max(10_000) int sortOrder,
            boolean active) {
    }

    public record AdminCategory(UUID id, String slug, String name, String description, ProductFamily productFamily,
                                String accentHex, UUID parentId, int sortOrder, boolean active) {
    }

    public record ColorCreateRequest(@NotBlank @Size(max = 40) @Pattern(regexp = SLUG) String code,
                                     @NotBlank @Size(max = 80) String name,
                                     @NotBlank @Pattern(regexp = HEX) String hex,
                                     @Min(0) int sortOrder) {
    }

    public record AdminColor(UUID id, String code, String name, String hex, int sortOrder) {
    }

    /** Wrapper so nested lists are validated. */
    public record Bulk<T>(@Valid @NotEmpty List<T> items) {
    }
}
