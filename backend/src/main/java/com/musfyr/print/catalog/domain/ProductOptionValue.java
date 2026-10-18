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
@Table(name = "product_option_values")
public class ProductOptionValue {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private ProductOptionGroup group;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String label;

    @Column(name = "price_delta_minor", nullable = false)
    private long priceDeltaMinor;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected ProductOptionValue() {
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getLabel() { return label; }
    public long getPriceDeltaMinor() { return priceDeltaMinor; }
    public int getSortOrder() { return sortOrder; }
}
