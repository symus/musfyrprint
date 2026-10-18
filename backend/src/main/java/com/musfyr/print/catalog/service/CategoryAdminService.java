package com.musfyr.print.catalog.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.catalog.domain.Category;
import com.musfyr.print.catalog.domain.Color;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminCategory;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.AdminColor;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.CategoryUpsertRequest;
import com.musfyr.print.catalog.dto.AdminCatalogDtos.ColorCreateRequest;
import com.musfyr.print.catalog.repository.CategoryRepository;
import com.musfyr.print.catalog.repository.ColorRepository;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.common.error.NotFoundException;

@Service
@Transactional
@PreAuthorize("hasAnyRole('ADMIN', 'DESIGNER')")
public class CategoryAdminService {

    private final CategoryRepository categories;
    private final ColorRepository colors;
    private final AuditService audit;

    public CategoryAdminService(CategoryRepository categories, ColorRepository colors, AuditService audit) {
        this.categories = categories;
        this.colors = colors;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AdminCategory> listCategories() {
        return categories.findAllByOrderBySortOrderAscNameAsc().stream().map(CategoryAdminService::toView).toList();
    }

    @CatalogCacheEviction
    @PreAuthorize("hasRole('ADMIN')")
    public AdminCategory createCategory(CategoryUpsertRequest req) {
        if (categories.existsBySlug(req.slug())) {
            throw new ConflictException("A category with slug '" + req.slug() + "' already exists");
        }
        Category category = new Category(req.slug(), req.name(), req.productFamily());
        apply(category, req);
        categories.save(category);
        audit.record("CATEGORY_CREATED", "Category", category.getId().toString(), Map.of("slug", req.slug()));
        return toView(category);
    }

    @CatalogCacheEviction
    @PreAuthorize("hasRole('ADMIN')")
    public AdminCategory updateCategory(UUID id, CategoryUpsertRequest req) {
        Category category = categories.findById(id).orElseThrow(() -> new NotFoundException("Category", id));
        categories.findBySlug(req.slug()).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
            throw new ConflictException("A category with slug '" + req.slug() + "' already exists");
        });
        category.setSlug(req.slug());
        category.setName(req.name());
        category.setProductFamily(req.productFamily());
        apply(category, req);
        audit.record("CATEGORY_UPDATED", "Category", id.toString(), Map.of("slug", req.slug(), "active", req.active()));
        return toView(category);
    }

    @Transactional(readOnly = true)
    public List<AdminColor> listColors() {
        return colors.findAllByOrderBySortOrderAsc().stream()
                .map(c -> new AdminColor(c.getId(), c.getCode(), c.getName(), c.getHex(), c.getSortOrder())).toList();
    }

    @CatalogCacheEviction
    public AdminColor createColor(ColorCreateRequest req) {
        if (colors.existsByCode(req.code())) {
            throw new ConflictException("Colour '" + req.code() + "' already exists");
        }
        Color color = colors.save(new Color(req.code(), req.name(), req.hex().toUpperCase(), req.sortOrder()));
        audit.record("COLOR_CREATED", "Color", color.getId().toString(), Map.of("code", req.code()));
        return new AdminColor(color.getId(), color.getCode(), color.getName(), color.getHex(), color.getSortOrder());
    }

    private void apply(Category category, CategoryUpsertRequest req) {
        category.setDescription(req.description());
        category.setAccentHex(req.accentHex());
        category.setSortOrder(req.sortOrder());
        category.setActive(req.active());
        if (req.parentId() == null) {
            category.setParent(null);
        } else {
            if (req.parentId().equals(category.getId())) {
                throw new BusinessRuleException("A category cannot be its own parent");
            }
            Category parent = categories.findById(req.parentId())
                    .orElseThrow(() -> new BusinessRuleException("Unknown parent category"));
            for (Category c = parent; c != null; c = c.getParent()) {
                if (c.getId().equals(category.getId())) {
                    throw new BusinessRuleException("Category hierarchy cannot contain cycles");
                }
            }
            category.setParent(parent);
        }
    }

    private static AdminCategory toView(Category c) {
        return new AdminCategory(c.getId(), c.getSlug(), c.getName(), c.getDescription(), c.getProductFamily(),
                c.getAccentHex(), c.getParent() == null ? null : c.getParent().getId(), c.getSortOrder(), c.isActive());
    }
}
