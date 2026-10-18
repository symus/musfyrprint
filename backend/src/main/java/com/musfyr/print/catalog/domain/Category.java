package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.musfyr.print.common.domain.TimestampedEntity;

@Entity
@Table(name = "categories")
public class Category extends TimestampedEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_family", nullable = false)
    private ProductFamily productFamily;

    @Column(name = "accent_hex")
    private String accentHex;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active = true;

    protected Category() {
    }

    public Category(String slug, String name, ProductFamily productFamily) {
        this.id = UUID.randomUUID();
        this.slug = slug;
        this.name = name;
        this.productFamily = productFamily;
    }

    public UUID getId() { return id; }
    public Category getParent() { return parent; }
    public void setParent(Category parent) { this.parent = parent; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ProductFamily getProductFamily() { return productFamily; }
    public void setProductFamily(ProductFamily productFamily) { this.productFamily = productFamily; }
    public String getAccentHex() { return accentHex; }
    public void setAccentHex(String accentHex) { this.accentHex = accentHex; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
