package com.musfyr.print.catalog.domain;

import java.io.Serializable;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

/** Which print methods a product supports – not every method suits every garment or material. */
@Entity
@Table(name = "product_print_methods")
public class ProductPrintMethod {

    @EmbeddedId
    private Key id;

    @MapsId("productId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @MapsId("printMethodId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "print_method_id")
    private PrintMethod printMethod;

    @Column(name = "price_delta_minor", nullable = false)
    private long priceDeltaMinor;

    @Column(name = "is_default", nullable = false)
    private boolean defaultMethod;

    protected ProductPrintMethod() {
    }

    public PrintMethod getPrintMethod() { return printMethod; }
    public long getPriceDeltaMinor() { return priceDeltaMinor; }
    public boolean isDefaultMethod() { return defaultMethod; }

    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "product_id")
        private UUID productId;

        @Column(name = "print_method_id")
        private UUID printMethodId;

        protected Key() {
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k && java.util.Objects.equals(productId, k.productId)
                    && java.util.Objects.equals(printMethodId, k.printMethodId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(productId, printMethodId);
        }
    }
}
