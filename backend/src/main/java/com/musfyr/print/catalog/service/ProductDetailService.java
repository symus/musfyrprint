package com.musfyr.print.catalog.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.musfyr.print.catalog.domain.Category;
import com.musfyr.print.catalog.domain.Color;
import com.musfyr.print.catalog.domain.Product;
import com.musfyr.print.catalog.domain.ProductStatus;
import com.musfyr.print.catalog.domain.ProductVariant;
import com.musfyr.print.catalog.dto.CatalogDtos.Breadcrumb;
import com.musfyr.print.catalog.dto.CatalogDtos.ColorView;
import com.musfyr.print.catalog.dto.CatalogDtos.ImageView;
import com.musfyr.print.catalog.dto.CatalogDtos.OptionGroupView;
import com.musfyr.print.catalog.dto.CatalogDtos.OptionValueView;
import com.musfyr.print.catalog.dto.CatalogDtos.PrintAreaView;
import com.musfyr.print.catalog.dto.CatalogDtos.PrintMethodView;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductDetail;
import com.musfyr.print.catalog.dto.CatalogDtos.ProductionTime;
import com.musfyr.print.catalog.dto.CatalogDtos.SizeView;
import com.musfyr.print.catalog.dto.CatalogDtos.VariantView;
import com.musfyr.print.catalog.repository.ProductRepository;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.i18n.Translations;
import com.musfyr.print.common.web.Money;

@Service
@Transactional(readOnly = true)
public class ProductDetailService {

    public static final String CACHE = "catalog-product-detail";

    private final ProductRepository products;
    private final Translations translations;

    public ProductDetailService(ProductRepository products, Translations translations) {
        this.products = products;
        this.translations = translations;
    }

    @Cacheable(cacheNames = CACHE, key = "#slug + ':' + #lang")
    public ProductDetail bySlug(String slug, String lang) {
        Product p = products.findBySlugAndStatus(slug, ProductStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Product", slug));
        return toDetail(p, lang);
    }

    private ProductDetail toDetail(Product p, String lang) {
        String currency = p.getCurrency();
        String i18n = p.getI18n();
        List<ProductVariant> activeVariants = p.getVariants().stream().filter(ProductVariant::isActive).toList();

        List<VariantView> variants = activeVariants.stream()
                .map(v -> new VariantView(v.getId(), v.getSku(), v.getColor() == null ? null : v.getColor().getCode(),
                        v.getSizeCode(), new Money(v.effectivePriceMinor(), currency), v.availability().name()))
                .toList();

        Map<String, Boolean> sizes = new LinkedHashMap<>();
        activeVariants.forEach(v -> sizes.merge(v.getSizeCode(), isPurchasable(v), Boolean::logicalOr));

        long priceFrom = activeVariants.stream().mapToLong(ProductVariant::effectivePriceMinor).min()
                .orElse(p.getBasePriceMinor());

        return new ProductDetail(p.getId(), p.getSlug(),
                translations.text(i18n, lang, "name", p.getName()),
                translations.text(i18n, lang, "short_description", p.getShortDescription()),
                translations.text(i18n, lang, "description", p.getDescription()),
                p.getProductFamily().name(), p.getGarmentType().name(), p.getAgeGroup().name(), p.getGender().name(),
                p.getFit().name(), translations.text(i18n, lang, "material", p.getMaterial()),
                new Money(priceFrom, currency), new Money(p.getBasePriceMinor(), currency),
                p.getCompareAtMinor() == null ? null : new Money(p.getCompareAtMinor(), currency),
                p.isCustomizable(), p.isFeatured(), p.getRatingAvg(), p.getRatingCount(), p.getTags(),
                p.getModelKey(), new ProductionTime(p.getProductionDaysMin(), p.getProductionDaysMax()),
                breadcrumbs(p.getCategory(), lang),
                p.sortedColors().stream().map(c -> color(c, lang)).toList(),
                sizes.entrySet().stream().map(e -> new SizeView(e.getKey(), e.getValue())).toList(),
                variants,
                p.getOptionGroups().stream().map(g -> new OptionGroupView(g.getCode(),
                        translations.text(g.getI18n(), lang, "name", g.getName()), g.isRequired(),
                        g.getValues().stream().map(v -> new OptionValueView(v.getCode(),
                                translations.text(v.getI18n(), lang, "label", v.getLabel()),
                                v.getPriceDeltaMinor())).toList())).toList(),
                p.getPrintAreas().stream().map(a -> new PrintAreaView(a.getCode(),
                        translations.text(a.getI18n(), lang, "name", a.getName()), a.getWidthMm(), a.getHeightMm(),
                        a.getSafeMarginMm(), a.getMinDpi(), a.getPriceDeltaMinor())).toList(),
                p.getPrintMethods().stream()
                        .filter(m -> m.getPrintMethod().isActive())
                        .sorted((a, b) -> Boolean.compare(b.isDefaultMethod(), a.isDefaultMethod()))
                        .map(m -> new PrintMethodView(m.getPrintMethod().getCode(),
                                translations.text(m.getPrintMethod().getI18n(), lang, "name", m.getPrintMethod().getName()),
                                translations.text(m.getPrintMethod().getI18n(), lang, "description",
                                        m.getPrintMethod().getDescription()),
                                m.getPriceDeltaMinor(), m.isDefaultMethod()))
                        .toList(),
                p.getImages().stream().map(i -> new ImageView(i.getUrl(), i.getAltText(),
                        i.getColor() == null ? null : i.getColor().getCode())).toList());
    }

    private ColorView color(Color c, String lang) {
        return new ColorView(c.getCode(), translations.text(c.getI18n(), lang, "name", c.getName()), c.getHex());
    }

    private static boolean isPurchasable(ProductVariant v) {
        ProductVariant.Availability a = v.availability();
        return a == ProductVariant.Availability.IN_STOCK || a == ProductVariant.Availability.LOW_STOCK;
    }

    private List<Breadcrumb> breadcrumbs(Category category, String lang) {
        List<Breadcrumb> crumbs = new ArrayList<>();
        for (Category c = category; c != null; c = c.getParent()) {
            crumbs.addFirst(new Breadcrumb(c.getSlug(), translations.text(c.getI18n(), lang, "name", c.getName())));
        }
        return crumbs;
    }
}
