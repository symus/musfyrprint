package com.musfyr.print.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.catalog.domain.Category;
import com.musfyr.print.catalog.domain.Color;
import com.musfyr.print.catalog.domain.Product;
import com.musfyr.print.catalog.domain.ProductFamily;
import com.musfyr.print.catalog.domain.ProductStatus;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.GenerateVariantsRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.ProductUpsertRequest;
import com.musfyr.print.catalog.repository.CategoryRepository;
import com.musfyr.print.catalog.repository.ColorRepository;
import com.musfyr.print.catalog.repository.ProductRepository;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.config.AppProperties;

@ExtendWith(MockitoExtension.class)
class ProductAdminServiceTest {

    @Mock ProductRepository products;
    @Mock CategoryRepository categories;
    @Mock ColorRepository colors;
    @Mock AuditService audit;

    ProductAdminService service;
    Category tees = new Category("t-shirts", "T-Shirts", ProductFamily.APPAREL);

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(null,
                new AppProperties.Commerce("PLN", "pl-PL", List.of("PLN"), List.of("pl-PL"), "EU"), null, null);
        service = new ProductAdminService(products, categories, colors, audit, props);
    }

    private ProductUpsertRequest request(String slug, List<String> colorCodes, Long version) {
        return new ProductUpsertRequest(tees.getId(), slug, "Tee", null, null, ProductFamily.APPAREL, null, null,
                null, null, null, 5900L, null, null, 2, 4, true, false, List.of("a", "a"), null, colorCodes, version);
    }

    @Test
    void createRejectsDuplicateSlug() {
        when(products.existsBySlug("tee")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request("tee", null, null))).isInstanceOf(ConflictException.class);
        verify(products, never()).save(any());
    }

    @Test
    void createDefaultsCurrencyDeduplicatesTagsAndAudits() {
        when(categories.findById(tees.getId())).thenReturn(Optional.of(tees));
        var detail = service.create(request("tee", null, null));
        assertThat(detail.currency()).isEqualTo("PLN");
        assertThat(detail.tags()).containsExactly("a");
        assertThat(detail.status()).isEqualTo(ProductStatus.DRAFT);
        verify(audit).record(eq("PRODUCT_CREATED"), eq("Product"), any(), anyMap());
    }

    @Test
    void createFailsForUnknownColours() {
        when(categories.findById(tees.getId())).thenReturn(Optional.of(tees));
        when(colors.findByCodeIn(List.of("black", "nope"))).thenReturn(List.of(new Color("black", "Black", "#000000", 1)));
        assertThatThrownBy(() -> service.create(request("tee", List.of("black", "nope"), null)))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("nope");
    }

    @Test
    void updateRequiresMatchingVersion() {
        Product product = new Product(tees, "tee", "Tee", ProductFamily.APPAREL, 100, "PLN");
        when(products.findById(product.getId())).thenReturn(Optional.of(product));
        assertThatThrownBy(() -> service.update(product.getId(), request("tee", null, 7L)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void publishingRequiresAnActiveVariant() {
        Product product = new Product(tees, "tee", "Tee", ProductFamily.APPAREL, 100, "PLN");
        when(products.findById(product.getId())).thenReturn(Optional.of(product));
        assertThatThrownBy(() -> service.changeStatus(product.getId(), ProductStatus.ACTIVE))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void generateVariantsSkipsExistingCombinations() {
        Product product = new Product(tees, "tee", "Tee", ProductFamily.APPAREL, 100, "PLN");
        Color black = new Color("black", "Black", "#000000", 1);
        product.getColors().add(black);
        product.addVariant("T-BLACK-M", black, "M", 2, 1);
        when(products.findById(product.getId())).thenReturn(Optional.of(product));

        var detail = service.generateVariants(product.getId(),
                new GenerateVariantsRequest(null, List.of("S", "M", "L", "m"), 10, "T"));

        assertThat(detail.variants()).extracting(v -> v.sizeCode()).containsExactlyInAnyOrder("M", "S", "L");
        verify(audit).record(eq("VARIANTS_GENERATED"), eq("Product"), eq(product.getId().toString()),
                eq(Map.of("created", 2, "sizes", List.of("S", "M", "L", "m"))));
    }

    @Test
    void activatingProductWithVariantSucceeds() {
        Product product = new Product(tees, "tee", "Tee", ProductFamily.APPAREL, 100, "PLN");
        product.addVariant("T-STD-M", null, "M", 1, 1);
        when(products.findById(product.getId())).thenReturn(Optional.of(product));
        assertThat(service.changeStatus(product.getId(), ProductStatus.ACTIVE).status()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(UUID.fromString(product.getId().toString())).isEqualTo(product.getId());
    }
}
