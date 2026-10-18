package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.musfyr.print.common.domain.TimestampedEntity;

@Entity
@Table(name = "product_variants")
public class ProductVariant extends TimestampedEntity {

    public static final int LOW_STOCK_THRESHOLD = 5;

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, unique = true)
    private String sku;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "color_id")
    private Color color;

    @Column(name = "size_code", nullable = false)
    private String sizeCode;

    @Column(name = "size_sort", nullable = false)
    private int sizeSort;

    @Column(name = "price_minor")
    private Long priceMinor;

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    @Column(name = "track_inventory", nullable = false)
    private boolean trackInventory = true;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    private long version;

    protected ProductVariant() {
    }

    ProductVariant(Product product, String sku, Color color, String sizeCode, int sizeSort, int stockQuantity) {
        this.id = UUID.randomUUID();
        this.product = product;
        this.sku = sku;
        this.color = color;
        this.sizeCode = sizeCode;
        this.sizeSort = sizeSort;
        this.stockQuantity = stockQuantity;
    }

    public long effectivePriceMinor() {
        return priceMinor != null ? priceMinor : product.getBasePriceMinor();
    }

    public Availability availability() {
        if (!active) {
            return Availability.UNAVAILABLE;
        }
        if (!trackInventory) {
            return Availability.IN_STOCK;
        }
        if (stockQuantity <= 0) {
            return Availability.OUT_OF_STOCK;
        }
        return stockQuantity <= LOW_STOCK_THRESHOLD ? Availability.LOW_STOCK : Availability.IN_STOCK;
    }

    public enum Availability { IN_STOCK, LOW_STOCK, OUT_OF_STOCK, UNAVAILABLE }

    public UUID getId() { return id; }
    public Product getProduct() { return product; }
    public String getSku() { return sku; }
    public Color getColor() { return color; }
    public String getSizeCode() { return sizeCode; }
    public int getSizeSort() { return sizeSort; }
    public Long getPriceMinor() { return priceMinor; }
    public void setPriceMinor(Long priceMinor) { this.priceMinor = priceMinor; }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public boolean isTrackInventory() { return trackInventory; }
    public void setTrackInventory(boolean trackInventory) { this.trackInventory = trackInventory; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public long getVersion() { return version; }
}
