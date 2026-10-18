package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_images")
public class ProductImage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "color_id")
    private Color color;

    @Column(nullable = false)
    private String url;

    @Column(name = "alt_text", nullable = false)
    private String altText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected ProductImage() {
    }

    public UUID getId() { return id; }
    public Color getColor() { return color; }
    public String getUrl() { return url; }
    public String getAltText() { return altText; }
    public int getSortOrder() { return sortOrder; }
}
