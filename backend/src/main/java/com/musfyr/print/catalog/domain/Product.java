package com.musfyr.print.catalog.domain;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.musfyr.print.common.domain.TimestampedEntity;

@Entity
@Table(name = "products")
public class Product extends TimestampedEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_description")
    private String shortDescription;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_family", nullable = false)
    private ProductFamily productFamily;

    @Enumerated(EnumType.STRING)
    @Column(name = "garment_type", nullable = false)
    private GarmentType garmentType = GarmentType.NONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_group", nullable = false)
    private AgeGroup ageGroup = AgeGroup.NA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender = Gender.NA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Fit fit = Fit.NA;

    private String material;

    @Column(name = "base_price_minor", nullable = false)
    private long basePriceMinor;

    @Column(name = "compare_at_minor")
    private Long compareAtMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "production_days_min", nullable = false)
    private int productionDaysMin = 2;

    @Column(name = "production_days_max", nullable = false)
    private int productionDaysMax = 5;

    @Column(nullable = false)
    private boolean customizable = true;

    @Column(nullable = false)
    private boolean featured;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.DRAFT;

    @Column(nullable = false)
    private String[] tags = new String[0];

    @Column(name = "model_key")
    private String modelKey;

    @Column(name = "rating_avg", nullable = false)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;

    @Version
    private long version;

    @ManyToMany
    @JoinTable(name = "product_colors",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "color_id"))
    private Set<Color> colors = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sizeSort ASC")
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProductImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProductOptionGroup> optionGroups = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<PrintArea> printAreas = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductPrintMethod> printMethods = new LinkedHashSet<>();

    protected Product() {
    }

    public Product(Category category, String slug, String name, ProductFamily family, long basePriceMinor,
                   String currency) {
        this.id = UUID.randomUUID();
        this.category = category;
        this.slug = slug;
        this.name = name;
        this.productFamily = family;
        this.basePriceMinor = basePriceMinor;
        this.currency = currency;
    }

    public ProductVariant addVariant(String sku, Color color, String sizeCode, int sizeSort, int stock) {
        ProductVariant variant = new ProductVariant(this, sku, color, sizeCode, sizeSort, stock);
        variants.add(variant);
        return variant;
    }

    public boolean hasVariant(Color color, String sizeCode) {
        return variants.stream().anyMatch(v -> v.getSizeCode().equalsIgnoreCase(sizeCode)
                && (color == null ? v.getColor() == null : v.getColor() != null && v.getColor().getId().equals(color.getId())));
    }

    public boolean hasSellableVariant() {
        return variants.stream().anyMatch(ProductVariant::isActive);
    }

    public List<Color> sortedColors() {
        return colors.stream().sorted(Comparator.comparingInt(Color::getSortOrder)).toList();
    }

    public UUID getId() { return id; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ProductFamily getProductFamily() { return productFamily; }
    public void setProductFamily(ProductFamily productFamily) { this.productFamily = productFamily; }
    public GarmentType getGarmentType() { return garmentType; }
    public void setGarmentType(GarmentType garmentType) { this.garmentType = garmentType; }
    public AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(AgeGroup ageGroup) { this.ageGroup = ageGroup; }
    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }
    public Fit getFit() { return fit; }
    public void setFit(Fit fit) { this.fit = fit; }
    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }
    public long getBasePriceMinor() { return basePriceMinor; }
    public void setBasePriceMinor(long basePriceMinor) { this.basePriceMinor = basePriceMinor; }
    public Long getCompareAtMinor() { return compareAtMinor; }
    public void setCompareAtMinor(Long compareAtMinor) { this.compareAtMinor = compareAtMinor; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public int getProductionDaysMin() { return productionDaysMin; }
    public int getProductionDaysMax() { return productionDaysMax; }
    public void setProductionDays(int min, int max) { this.productionDaysMin = min; this.productionDaysMax = max; }
    public boolean isCustomizable() { return customizable; }
    public void setCustomizable(boolean customizable) { this.customizable = customizable; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) { this.status = status; }
    public List<String> getTags() { return List.of(tags); }
    public void setTags(List<String> tags) { this.tags = tags.toArray(String[]::new); }
    public String getModelKey() { return modelKey; }
    public void setModelKey(String modelKey) { this.modelKey = modelKey; }
    public BigDecimal getRatingAvg() { return ratingAvg; }
    public int getRatingCount() { return ratingCount; }
    public long getVersion() { return version; }
    public Set<Color> getColors() { return colors; }
    public List<ProductVariant> getVariants() { return variants; }
    public List<ProductImage> getImages() { return images; }
    public List<ProductOptionGroup> getOptionGroups() { return optionGroups; }
    public List<PrintArea> getPrintAreas() { return printAreas; }
    public Set<ProductPrintMethod> getPrintMethods() { return printMethods; }
}
