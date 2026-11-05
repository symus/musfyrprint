package com.musfyr.print.commerce;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.web.Money;
import com.musfyr.print.design.DesignChecker;
import com.musfyr.print.design.DesignService;

/**
 * Server-side carts. Guests are identified by an unguessable cart id in an HttpOnly cookie; signed-in customers by
 * their account (a guest cart is merged into it at sign-in). Every price shown comes from {@link PriceCalculator}.
 */
@Service
public class CartService {

    private static final TypeReference<Map<String, String>> OPTIONS = new TypeReference<>() {
    };

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final CommerceRepository repo;
    private final DesignService designs;
    private final ShopProperties shop;
    private final Clock clock;

    public CartService(JdbcClient jdbc, JsonMapper json, CommerceRepository repo, DesignService designs, ShopProperties shop, Clock clock) {
        this.jdbc = jdbc;
        this.json = json;
        this.repo = repo;
        this.designs = designs;
        this.shop = shop;
        this.clock = clock;
    }

    public record AddItemRequest(UUID variantId, @Size(max = 120) String productSlug, @Size(max = 40) String colorCode,
                                 @Size(max = 30) String sizeCode, @Min(1) @Max(10000) int quantity,
                                 Map<String, String> options, UUID designId, @Size(max = 100) String designToken) {
    }

    public record CartLine(UUID id, UUID variantId, String productSlug, String productName, String garmentType, String sku,
                           String colorCode, String colorName, String colorHex, String sizeCode, int quantity,
                           Map<String, String> options, UUID designId, List<String> printZones, Money unitPrice,
                           Money lineTotal, int volumePercent, boolean available, int stockShortfall,
                           List<DesignChecker.Warning> designErrors) {
    }

    public record CartView(UUID id, List<CartLine> lines, int itemCount, Money subtotal, String promotionCode,
                           String promotionError, Money discount, Money shipping, Money total, String taxMode,
                           Money taxIncluded, List<CommerceRepository.ShippingMethod> shippingMethods, String shippingMethod) {
    }

    /** Internal representation used by checkout. */
    record Priced(CartView view, PriceCalculator.Quote quote, List<RawLine> raw) {
    }

    record RawLine(UUID id, CommerceRepository.VariantInfo variant, int quantity, Map<String, String> options, UUID designId,
                   List<String> zones, long optionsMinor, long printMethodMinor, long zoneFeesMinor,
                   DesignService.DesignView design) {
    }

    // ------------------------------------------------------------------------------------------- cart identity

    /** The active cart for this request, or null if there is none yet. */
    @Transactional(readOnly = true)
    public UUID find(UUID cookieCartId, UUID userId) {
        if (userId != null) {
            return jdbc.sql("SELECT id FROM carts WHERE user_id = :u AND status = 'ACTIVE'").param("u", userId)
                    .query(UUID.class).optional().orElse(null);
        }
        if (cookieCartId == null) {
            return null;
        }
        return jdbc.sql("SELECT id FROM carts WHERE id = :id AND status = 'ACTIVE' AND user_id IS NULL").param("id", cookieCartId)
                .query(UUID.class).optional().orElse(null);
    }

    @Transactional
    public UUID findOrCreate(UUID cookieCartId, UUID userId) {
        UUID existing = find(cookieCartId, userId);
        if (existing != null) {
            return existing;
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO carts (id, user_id, currency) VALUES (:id, :u, 'PLN')").param("id", id).param("u", userId).update();
        return id;
    }

    /** Moves a guest cart's lines into the customer's cart after sign-in. */
    @Transactional
    public void mergeOnLogin(UUID guestCartId, UUID userId) {
        UUID guest = find(guestCartId, null);
        if (guest == null) {
            return;
        }
        UUID target = findOrCreate(null, userId);
        jdbc.sql("UPDATE cart_items SET cart_id = :t WHERE cart_id = :g").param("t", target).param("g", guest).update();
        jdbc.sql("UPDATE carts SET status = 'MERGED', updated_at = now() WHERE id = :g").param("g", guest).update();
    }

    // ------------------------------------------------------------------------------------------- mutations

    @Transactional
    public void add(UUID cartId, AddItemRequest req, String lang) {
        UUID variantId = req.variantId() != null ? req.variantId()
                : repo.variantFor(req.productSlug(), req.colorCode(), req.sizeCode())
                .orElseThrow(() -> new BusinessRuleException("Please choose an available colour and size"));
        CommerceRepository.VariantInfo v = repo.variant(variantId, lang)
                .orElseThrow(() -> new BusinessRuleException("This product is not available"));
        if (!v.available()) {
            throw new BusinessRuleException("This product is not available");
        }
        Map<String, String> options = req.options() == null ? Map.of() : req.options();
        repo.optionsSurcharge(v.productId(), options); // validates
        if (req.designId() != null) {
            DesignService.DesignView d = designs.access(req.designId(), req.designToken());
            if (!d.productSlug().equals(v.productSlug())) {
                throw new BusinessRuleException("The design belongs to a different product");
            }
        }
        String optionsJson = json.writeValueAsString(new java.util.TreeMap<>(options));
        UUID same = jdbc.sql("""
                SELECT id FROM cart_items WHERE cart_id = :c AND variant_id = :v AND options = CAST(:o AS jsonb)
                  AND design_id IS NOT DISTINCT FROM :d""")
                .param("c", cartId).param("v", variantId).param("o", optionsJson).param("d", req.designId())
                .query(UUID.class).optional().orElse(null);
        if (same != null) {
            jdbc.sql("UPDATE cart_items SET quantity = LEAST(quantity + :q, 10000) WHERE id = :id")
                    .param("q", req.quantity()).param("id", same).update();
        } else {
            long lines = jdbc.sql("SELECT count(*) FROM cart_items WHERE cart_id = :c").param("c", cartId).query(Long.class).single();
            if (lines >= 50) {
                throw new BusinessRuleException("Your cart is full (50 different items)");
            }
            jdbc.sql("""
                    INSERT INTO cart_items (id, cart_id, product_id, variant_id, design_id, quantity, options)
                    VALUES (:id, :c, :p, :v, :d, :q, CAST(:o AS jsonb))""")
                    .param("id", UUID.randomUUID()).param("c", cartId).param("p", v.productId()).param("v", variantId)
                    .param("d", req.designId()).param("q", req.quantity()).param("o", optionsJson).update();
        }
        touch(cartId);
    }

    @Transactional
    public void setQuantity(UUID cartId, UUID itemId, int quantity) {
        if (quantity < 1 || quantity > 10000) {
            throw new BusinessRuleException("Quantity must be between 1 and 10000");
        }
        if (jdbc.sql("UPDATE cart_items SET quantity = :q WHERE id = :id AND cart_id = :c")
                .param("q", quantity).param("id", itemId).param("c", cartId).update() == 0) {
            throw new NotFoundException("Cart item", itemId);
        }
        touch(cartId);
    }

    @Transactional
    public void remove(UUID cartId, UUID itemId) {
        jdbc.sql("DELETE FROM cart_items WHERE id = :id AND cart_id = :c").param("id", itemId).param("c", cartId).update();
        touch(cartId);
    }

    @Transactional
    public void setPromotion(UUID cartId, String code) {
        jdbc.sql("UPDATE carts SET promotion_code = :code, updated_at = now() WHERE id = :c")
                .param("code", code == null || code.isBlank() ? null : code.trim().toUpperCase()).param("c", cartId).update();
    }

    private void touch(UUID cartId) {
        jdbc.sql("UPDATE carts SET updated_at = now() WHERE id = :c").param("c", cartId).update();
    }

    // ------------------------------------------------------------------------------------------- pricing

    @Transactional(readOnly = true)
    public CartView view(UUID cartId, String shippingMethod, String lang) {
        return price(cartId, shippingMethod, null, lang).view();
    }

    /** Prices the cart; {@code promotionOverride} (checkout) replaces the stored code when given. */
    @Transactional(readOnly = true)
    Priced price(UUID cartId, String shippingMethod, String promotionOverride, String lang) {
        List<CommerceRepository.ShippingMethod> methods = repo.shippingMethods(lang);
        if (cartId == null) {
            CartView empty = new CartView(null, List.of(), 0, money(0), null, null, money(0), money(0), money(0),
                    shop.tax().mode(), money(0), methods, shippingMethod);
            return new Priced(empty, null, List.of());
        }
        String storedCode = jdbc.sql("SELECT promotion_code FROM carts WHERE id = :c").param("c", cartId)
                .query(String.class).optional().orElse(null);
        String code = promotionOverride != null ? promotionOverride : storedCode;

        record Row(UUID id, UUID variantId, int quantity, Map<String, String> options, UUID designId) {
        }
        List<Row> rows = jdbc.sql("SELECT id, variant_id, quantity, options::text AS options, design_id FROM cart_items WHERE cart_id = :c ORDER BY created_at")
                .param("c", cartId)
                .query((rs, i) -> new Row(rs.getObject("id", UUID.class), rs.getObject("variant_id", UUID.class), rs.getInt("quantity"),
                        json.readValue(rs.getString("options"), OPTIONS), rs.getObject("design_id", UUID.class)))
                .list();
        List<RawLine> lines = new ArrayList<>();
        for (Row r : rows) {
            CommerceRepository.VariantInfo v = repo.variant(r.variantId(), lang).orElseThrow();
            DesignService.DesignView design = r.designId() == null ? null : designs.internal(r.designId());
            List<String> zones = design == null ? List.of() : List.copyOf(design.document().path("zones").propertyNames());
            long options = safeOptions(v, r.options());
            long method = design == null ? 0 : repo.defaultPrintMethodSurcharge(v.productId());
            long zoneFees = repo.printAreaFees(v.productId(), zones);
            lines.add(new RawLine(r.id(), v, r.quantity(), r.options(), r.designId(), zones, options, method, zoneFees, design));
        }

        CommerceRepository.ShippingMethod ship = methods.stream().filter(m -> m.code().equals(shippingMethod)).findFirst().orElse(null);
        PriceCalculator.Quote q = PriceCalculator.calculate(
                lines.stream().map(l -> new PriceCalculator.LineInput(l.id().toString(), l.variant().priceMinor(),
                        l.optionsMinor(), l.printMethodMinor(), l.zoneFeesMinor(), l.quantity())).toList(),
                repo.tiers(), repo.promotion(code).orElse(null), code,
                ship == null ? null : new PriceCalculator.Shipping(ship.code(), ship.priceMinor()), shop.tax(), clock.instant());

        Map<UUID, Integer> demand = new java.util.HashMap<>();
        lines.forEach(l -> demand.merge(l.variant().variantId(), l.quantity(), Integer::sum));
        List<CartLine> views = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            RawLine l = lines.get(i);
            PriceCalculator.Line pl = q.lines().get(i);
            CommerceRepository.VariantInfo v = l.variant();
            int shortfall = v.trackInventory() ? Math.max(0, demand.get(v.variantId()) - v.stock()) : 0;
            List<DesignChecker.Warning> errors = l.design() == null ? List.of()
                    : l.design().warnings().stream().filter(w -> "ERROR".equals(w.severity())).toList();
            views.add(new CartLine(l.id(), v.variantId(), v.productSlug(), v.productName(), v.garmentType(), v.sku(),
                    v.colorCode(), v.colorName(), v.colorHex(), v.sizeCode(), l.quantity(), l.options(), l.designId(), l.zones(),
                    money(pl.unitPriceMinor()), money(pl.totalMinor()), pl.volumePercent(), v.available(), shortfall, errors));
        }
        int count = lines.stream().mapToInt(RawLine::quantity).sum();
        CartView view = new CartView(cartId, views, count, money(q.subtotalMinor()),
                q.promotionCode() != null ? q.promotionCode() : code, q.promotionError(), money(q.discountMinor()),
                money(q.shippingMinor()), money(q.totalMinor()), q.taxMode(), money(q.taxIncludedMinor()), methods,
                ship == null ? null : ship.code());
        return new Priced(view, q, lines);
    }

    private long safeOptions(CommerceRepository.VariantInfo v, Map<String, String> options) {
        try {
            return repo.optionsSurcharge(v.productId(), options);
        } catch (BusinessRuleException e) {
            return 0; // options changed since the item was added; checkout re-validates and asks to fix
        }
    }

    private static Money money(long minor) {
        return new Money(minor, "PLN");
    }
}
