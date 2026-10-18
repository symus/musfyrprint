package com.musfyr.print.catalog.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.catalog.domain.AgeGroup;
import com.musfyr.print.catalog.domain.Category;
import com.musfyr.print.catalog.domain.Color;
import com.musfyr.print.catalog.domain.Fit;
import com.musfyr.print.catalog.domain.GarmentType;
import com.musfyr.print.catalog.domain.Gender;
import com.musfyr.print.catalog.domain.Product;
import com.musfyr.print.catalog.domain.ProductStatus;
import com.musfyr.print.catalog.domain.ProductVariant;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminProductDetail;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminProductRow;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminVariant;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.GenerateVariantsRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.ProductUpsertRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.VariantUpdateRequest;
import com.musfyr.print.catalog.dto.CatalogDtos.ColorView;
import com.musfyr.print.catalog.repository.CategoryRepository;
import com.musfyr.print.catalog.repository.ColorRepository;
import com.musfyr.print.catalog.repository.ProductRepository;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.web.Money;
import com.musfyr.print.common.web.PageResponse;
import com.musfyr.print.config.AppProperties;

/** Back-office product management. Every mutation is audited and evicts storefront caches. */
@Service
@Transactional
@PreAuthorize("hasAnyRole('ADMIN', 'DESIGNER')")
public class ProductAdminService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ColorRepository colors;
    private final AuditService audit;
    private final String defaultCurrency;

    public ProductAdminService(ProductRepository products, CategoryRepository categories, ColorRepository colors,
                               AuditService audit, AppProperties props) {
        this.products = products;
        this.categories = categories;
        this.colors = colors;
        this.audit = audit;
        this.defaultCurrency = props.commerce().defaultCurrency();
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminProductRow> list(String q, ProductStatus status, UUID categoryId, int page, int size) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(q)) {
                String like = "%" + q.trim().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("name")), like, '\\'),
                        cb.like(root.get("slug"), like, '\\')));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Page<Product> result = products.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
        return PageResponse.from(result, this::toRow);
    }

    @Transactional(readOnly = true)
    public AdminProductDetail get(UUID id) {
        return toDetail(load(id));
    }

    @CatalogCacheEviction
    public AdminProductDetail create(ProductUpsertRequest req) {
        if (products.existsBySlug(req.slug())) {
            throw new ConflictException("A product with slug '" + req.slug() + "' already exists");
        }
        Product product = new Product(category(req.categoryId()), req.slug(), req.name(), req.productFamily(),
                req.basePriceMinor(), currencyOrDefault(req.currency()));
        apply(product, req);
        products.save(product);
        audit.record("PRODUCT_CREATED", "Product", product.getId().toString(),
                Map.of("slug", product.getSlug(), "name", product.getName()));
        return toDetail(product);
    }

    @CatalogCacheEviction
    public AdminProductDetail update(UUID id, ProductUpsertRequest req) {
        Product product = load(id);
        if (req.version() == null || req.version() != product.getVersion()) {
            throw new ConflictException("The product was modified by someone else. Reload and try again.");
        }
        if (products.existsBySlugAndIdNot(req.slug(), id)) {
            throw new ConflictException("A product with slug '" + req.slug() + "' already exists");
        }
        Map<String, Object> changes = diff(product, req);
        product.setCategory(category(req.categoryId()));
        product.setSlug(req.slug());
        product.setName(req.name());
        product.setProductFamily(req.productFamily());
        product.setBasePriceMinor(req.basePriceMinor());
        product.setCurrency(currencyOrDefault(req.currency()));
        apply(product, req);
        products.flush();
        audit.record("PRODUCT_UPDATED", "Product", id.toString(), changes);
        return toDetail(product);
    }

    @CatalogCacheEviction
    public AdminProductDetail changeStatus(UUID id, ProductStatus status) {
        Product product = load(id);
        if (status == ProductStatus.ACTIVE && !product.hasSellableVariant()) {
            throw new BusinessRuleException("A product needs at least one active variant before it can be published");
        }
        ProductStatus previous = product.getStatus();
        product.setStatus(status);
        audit.record("PRODUCT_STATUS_CHANGED", "Product", id.toString(),
                Map.of("from", previous.name(), "to", status.name()));
        return toDetail(product);
    }

    /** Creates the missing colour × size combinations; existing variants are left untouched. */
    @CatalogCacheEviction
    public AdminProductDetail generateVariants(UUID id, GenerateVariantsRequest req) {
        Product product = load(id);
        List<Color> variantColors = req.colorCodes() == null || req.colorCodes().isEmpty()
                ? product.sortedColors() : resolveColors(req.colorCodes());
        product.getColors().addAll(variantColors);

        List<Color> loop = variantColors.isEmpty() ? java.util.Collections.singletonList(null) : variantColors;
        Set<String> seenSizes = new HashSet<>();
        int created = 0;
        for (Color color : loop) {
            int sort = 0;
            for (String rawSize : req.sizeCodes()) {
                String size = rawSize.trim();
                sort++;
                if (!seenSizes.add((color == null ? "" : color.getCode()) + "|" + size.toUpperCase())
                        || product.hasVariant(color, size)) {
                    continue;
                }
                String sku = (req.skuPrefix() + "-" + (color == null ? "STD" : color.getCode()) + "-" + size)
                        .toUpperCase().replace('.', '_');
                product.addVariant(sku, color, size, sort, req.initialStock());
                created++;
            }
        }
        products.flush();
        audit.record("VARIANTS_GENERATED", "Product", id.toString(),
                Map.of("created", created, "sizes", req.sizeCodes()));
        return toDetail(product);
    }

    @CatalogCacheEviction
    public AdminVariant updateVariant(UUID productId, UUID variantId, VariantUpdateRequest req) {
        Product product = load(productId);
        ProductVariant variant = product.getVariants().stream().filter(v -> v.getId().equals(variantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Variant", variantId));
        if (req.version() != variant.getVersion()) {
            throw new ConflictException("The variant was modified by someone else. Reload and try again.");
        }
        Map<String, Object> changes = new LinkedHashMap<>();
        if (variant.getStockQuantity() != req.stockQuantity()) {
            changes.put("stock", variant.getStockQuantity() + " -> " + req.stockQuantity());
        }
        if (!Objects.equals(variant.getPriceMinor(), req.priceMinor())) {
            changes.put("priceMinor", variant.getPriceMinor() + " -> " + req.priceMinor());
        }
        if (variant.isActive() != req.active()) {
            changes.put("active", req.active());
        }
        variant.setPriceMinor(req.priceMinor());
        variant.setStockQuantity(req.stockQuantity());
        variant.setTrackInventory(req.trackInventory());
        variant.setActive(req.active());
        products.flush();
        audit.record("VARIANT_UPDATED", "ProductVariant", variantId.toString(), changes);
        return toVariant(variant);
    }

    // -----------------------------------------------------------------------------------------------------------

    private void apply(Product p, ProductUpsertRequest req) {
        p.setShortDescription(req.shortDescription());
        p.setDescription(req.description());
        p.setGarmentType(req.garmentType() == null ? GarmentType.NONE : req.garmentType());
        p.setAgeGroup(req.ageGroup() == null ? AgeGroup.NA : req.ageGroup());
        p.setGender(req.gender() == null ? Gender.NA : req.gender());
        p.setFit(req.fit() == null ? Fit.NA : req.fit());
        p.setMaterial(req.material());
        p.setCompareAtMinor(req.compareAtMinor());
        p.setProductionDays(req.productionDaysMin() == null ? 2 : req.productionDaysMin(),
                req.productionDaysMax() == null ? 5 : req.productionDaysMax());
        p.setCustomizable(req.customizable());
        p.setFeatured(req.featured());
        p.setTags(req.tags() == null ? List.of() : req.tags().stream().distinct().toList());
        p.setModelKey(StringUtils.hasText(req.modelKey()) ? req.modelKey() : null);
        if (req.colorCodes() != null) {
            List<Color> resolved = resolveColors(req.colorCodes());
            Set<UUID> inUse = new HashSet<>();
            p.getVariants().stream().filter(v -> v.getColor() != null).forEach(v -> inUse.add(v.getColor().getId()));
            Set<UUID> requested = new HashSet<>(resolved.stream().map(Color::getId).toList());
            if (!requested.containsAll(inUse)) {
                throw new BusinessRuleException("Colours that still have variants cannot be removed; deactivate the variants instead");
            }
            p.getColors().clear();
            p.getColors().addAll(resolved);
        }
    }

    private List<Color> resolveColors(List<String> codes) {
        List<Color> found = colors.findByCodeIn(codes);
        if (found.size() != new HashSet<>(codes).size()) {
            Set<String> known = new HashSet<>(found.stream().map(Color::getCode).toList());
            throw new BusinessRuleException("Unknown colour codes: "
                    + codes.stream().filter(c -> !known.contains(c)).toList());
        }
        return found;
    }

    private Map<String, Object> diff(Product p, ProductUpsertRequest req) {
        Map<String, Object> changes = new LinkedHashMap<>();
        if (!p.getName().equals(req.name())) {
            changes.put("name", req.name());
        }
        if (!p.getSlug().equals(req.slug())) {
            changes.put("slug", p.getSlug() + " -> " + req.slug());
        }
        if (p.getBasePriceMinor() != req.basePriceMinor()) {
            changes.put("basePriceMinor", p.getBasePriceMinor() + " -> " + req.basePriceMinor());
        }
        if (p.isFeatured() != req.featured()) {
            changes.put("featured", req.featured());
        }
        return changes;
    }

    private String currencyOrDefault(String currency) {
        return StringUtils.hasText(currency) ? currency : defaultCurrency;
    }

    private Category category(UUID id) {
        return categories.findById(id).orElseThrow(() -> new BusinessRuleException("Unknown category " + id));
    }

    private Product load(UUID id) {
        return products.findById(id).orElseThrow(() -> new NotFoundException("Product", id));
    }

    private AdminProductRow toRow(Product p) {
        return new AdminProductRow(p.getId(), p.getSlug(), p.getName(), p.getCategory().getName(),
                p.getProductFamily().name(), p.getStatus().name(), new Money(p.getBasePriceMinor(), p.getCurrency()),
                p.isFeatured(), p.getVariants().size(),
                p.getVariants().stream().mapToLong(ProductVariant::getStockQuantity).sum(), p.getUpdatedAt());
    }

    private AdminProductDetail toDetail(Product p) {
        return new AdminProductDetail(p.getId(), p.getCategory().getId(), p.getSlug(), p.getName(),
                p.getShortDescription(), p.getDescription(), p.getProductFamily(), p.getGarmentType(),
                p.getAgeGroup(), p.getGender(), p.getFit(), p.getMaterial(), p.getBasePriceMinor(),
                p.getCompareAtMinor(), p.getCurrency(), p.getProductionDaysMin(), p.getProductionDaysMax(),
                p.isCustomizable(), p.isFeatured(), p.getStatus(), p.getTags(), p.getModelKey(),
                p.sortedColors().stream().map(c -> new ColorView(c.getCode(), c.getName(), c.getHex())).toList(),
                p.getVariants().stream().map(this::toVariant).toList(), p.getVersion(), p.getCreatedAt(),
                p.getUpdatedAt());
    }

    private AdminVariant toVariant(ProductVariant v) {
        return new AdminVariant(v.getId(), v.getSku(), v.getColor() == null ? null : v.getColor().getCode(),
                v.getSizeCode(), v.getPriceMinor(), v.effectivePriceMinor(), v.getStockQuantity(),
                v.isTrackInventory(), v.isActive(), v.availability().name(), v.getVersion());
    }
}
