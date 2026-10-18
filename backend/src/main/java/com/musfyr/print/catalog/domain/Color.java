package com.musfyr.print.catalog.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "i18n", nullable = false)
    private String i18n = "{}";

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

    /** Translations as JSON: {"pl": {"name": "..."}}. */
    public String getI18n() { return i18n; }
}
