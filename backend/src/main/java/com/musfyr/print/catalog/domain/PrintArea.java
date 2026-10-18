package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A physical print zone (front, back, sleeve, sticker face) with dimensions in millimetres. */
@Entity
@Table(name = "print_areas")
public class PrintArea {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "width_mm", nullable = false)
    private int widthMm;

    @Column(name = "height_mm", nullable = false)
    private int heightMm;

    @Column(name = "safe_margin_mm", nullable = false)
    private int safeMarginMm;

    @Column(name = "min_dpi", nullable = false)
    private int minDpi;

    @Column(name = "price_delta_minor", nullable = false)
    private long priceDeltaMinor;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected PrintArea() {
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public int getWidthMm() { return widthMm; }
    public int getHeightMm() { return heightMm; }
    public int getSafeMarginMm() { return safeMarginMm; }
    public int getMinDpi() { return minDpi; }
    public long getPriceDeltaMinor() { return priceDeltaMinor; }
    public int getSortOrder() { return sortOrder; }
}
