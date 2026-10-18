package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "colors")
public class Color {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String hex;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected Color() {
    }

    public Color(String code, String name, String hex, int sortOrder) {
        this.id = UUID.randomUUID();
        this.code = code;
        this.name = name;
        this.hex = hex;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getHex() { return hex; }
    public int getSortOrder() { return sortOrder; }
}
