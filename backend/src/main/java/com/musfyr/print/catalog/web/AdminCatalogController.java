package com.musfyr.print.catalog.web;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.catalog.domain.ProductStatus;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminCategory;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminColor;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminProductDetail;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminProductRow;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminVariant;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.CategoryUpsertRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.ColorCreateRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.GenerateVariantsRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.ProductUpsertRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.StatusChangeRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.VariantUpdateRequest;
import com.musfyr.print.catalog.service.CategoryAdminService;
import com.musfyr.print.catalog.service.ProductAdminService;
import com.musfyr.print.common.web.PageResponse;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin · Catalogue")
@Validated
public class AdminCatalogController {

    private final ProductAdminService productAdmin;
    private final CategoryAdminService categoryAdmin;

    public AdminCatalogController(ProductAdminService productAdmin, CategoryAdminService categoryAdmin) {
        this.productAdmin = productAdmin;
        this.categoryAdmin = categoryAdmin;
    }

    @GetMapping("/products")
    @Operation(summary = "List products (all statuses)")
    public PageResponse<AdminProductRow> products(@RequestParam(required = false) @Size(max = 100) String q,
                                                  @RequestParam(required = false) ProductStatus status,
                                                  @RequestParam(required = false) UUID categoryId,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return productAdmin.list(q, status, categoryId, page, size);
    }

    @GetMapping("/products/{id}")
    public AdminProductDetail product(@PathVariable UUID id) {
        return productAdmin.get(id);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a product (starts as DRAFT)")
    public AdminProductDetail create(@Valid @RequestBody ProductUpsertRequest request) {
        return productAdmin.create(request);
    }

    @PutMapping("/products/{id}")
    @Operation(summary = "Update a product", description = "Requires the current version for optimistic locking.")
    public AdminProductDetail update(@PathVariable UUID id, @Valid @RequestBody ProductUpsertRequest request) {
        return productAdmin.update(id, request);
    }

    @PostMapping("/products/{id}/status")
    @Operation(summary = "Publish, unpublish or archive a product")
    public AdminProductDetail changeStatus(@PathVariable UUID id, @Valid @RequestBody StatusChangeRequest request) {
        return productAdmin.changeStatus(id, request.status());
    }

    @PostMapping("/products/{id}/variants/generate")
    @Operation(summary = "Generate missing colour × size variants")
    public AdminProductDetail generateVariants(@PathVariable UUID id,
                                               @Valid @RequestBody GenerateVariantsRequest request) {
        return productAdmin.generateVariants(id, request);
    }

    @PutMapping("/products/{id}/variants/{variantId}")
    @Operation(summary = "Update variant price override, stock and availability")
    public AdminVariant updateVariant(@PathVariable UUID id, @PathVariable UUID variantId,
                                      @Valid @RequestBody VariantUpdateRequest request) {
        return productAdmin.updateVariant(id, variantId, request);
    }

    @GetMapping("/categories")
    public List<AdminCategory> categories() {
        return categoryAdmin.listCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminCategory createCategory(@Valid @RequestBody CategoryUpsertRequest request) {
        return categoryAdmin.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public AdminCategory updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryUpsertRequest request) {
        return categoryAdmin.updateCategory(id, request);
    }

    @GetMapping("/colors")
    public List<AdminColor> colors() {
        return categoryAdmin.listColors();
    }

    @PostMapping("/colors")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminColor createColor(@Valid @RequestBody ColorCreateRequest request) {
        return categoryAdmin.createColor(request);
    }
}
