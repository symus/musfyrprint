package com.musfyr.print.commerce;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * The single source of truth for prices. Pure function: callers load data, this computes. Amounts are integer
 * minor units; every division rounds half-up once, at a documented step.
 *
 * <ol>
 *   <li>unit price = variant price + option surcharges + print-method surcharge + print-area fees</li>
 *   <li>line total = unit × quantity, minus the volume discount for that line's quantity</li>
 *   <li>subtotal = sum of line totals; promotion discount applies to the subtotal</li>
 *   <li>shipping = method price (or 0 with a free-shipping promotion)</li>
 *   <li>total = subtotal − discount + shipping; prices are gross, VAT is only reported as "included"</li>
 * </ol>
 */
public final class PriceCalculator {

    private PriceCalculator() {
    }

    public record LineInput(String key, long variantPriceMinor, long optionsMinor, long printMethodMinor,
                            long printAreaFeesMinor, int quantity) {
    }

    public record Tier(int minQuantity, int percent) {
    }

    public record Promotion(String code, String discountType, long discountValue, long minOrderMinor,
                            Instant startsAt, Instant endsAt, boolean active, Integer maxRedemptions, int redemptions) {
    }

    public record Shipping(String code, long priceMinor) {
    }

    public record Line(String key, long unitPriceMinor, int quantity, long grossMinor, int volumePercent,
                       long volumeDiscountMinor, long totalMinor, Map<String, Long> unitBreakdown) {
    }

    public record Quote(List<Line> lines, long subtotalMinor, String promotionCode, String promotionError,
                        long discountMinor, long shippingMinor, long totalMinor, String taxMode, long taxIncludedMinor) {
    }

    public static Quote calculate(List<LineInput> inputs, List<Tier> tiers, Promotion promotion, String requestedCode,
                                  Shipping shipping, ShopProperties.Tax tax, Instant now) {
        List<Line> lines = new ArrayList<>();
        long subtotal = 0;
        for (LineInput in : inputs) {
            long unit = in.variantPriceMinor() + in.optionsMinor() + in.printMethodMinor() + in.printAreaFeesMinor();
            long gross = unit * in.quantity();
            int pct = tiers.stream().filter(t -> in.quantity() >= t.minQuantity())
                    .max(Comparator.comparingInt(Tier::minQuantity)).map(Tier::percent).orElse(0);
            long volume = percentOf(gross, pct);
            long total = gross - volume;
            subtotal += total;
            lines.add(new Line(in.key(), unit, in.quantity(), gross, pct, volume, total, Map.of(
                    "variant", in.variantPriceMinor(), "options", in.optionsMinor(),
                    "printMethod", in.printMethodMinor(), "printAreas", in.printAreaFeesMinor())));
        }

        String appliedCode = null;
        String error = null;
        long discount = 0;
        boolean freeShipping = false;
        if (requestedCode != null && !requestedCode.isBlank()) {
            error = promotionError(promotion, subtotal, now);
            if (error == null) {
                appliedCode = promotion.code();
                switch (promotion.discountType()) {
                    case "PERCENT" -> discount = percentOf(subtotal, (int) promotion.discountValue());
                    case "FIXED" -> discount = Math.min(subtotal, promotion.discountValue());
                    case "FREE_SHIPPING" -> freeShipping = true;
                    default -> error = "INVALID";
                }
            }
        }
        long shippingMinor = shipping == null || freeShipping || inputs.isEmpty() ? 0 : shipping.priceMinor();
        long total = Math.max(0, subtotal - discount + shippingMinor);
        long taxIncluded = 0;
        if ("STANDARD".equals(tax.mode())) {
            // VAT included in a gross price: total − total / (1 + rate)
            BigDecimal divisor = BigDecimal.ONE.add(tax.standardRatePercent().movePointLeft(2));
            taxIncluded = total - BigDecimal.valueOf(total).divide(divisor, 0, RoundingMode.HALF_UP).longValue();
        }
        return new Quote(List.copyOf(lines), subtotal, appliedCode, error, discount, shippingMinor, total, tax.mode(), taxIncluded);
    }

    /** Why a code cannot be used right now, or null when it can. */
    static String promotionError(Promotion p, long subtotal, Instant now) {
        if (p == null || !p.active()) {
            return "NOT_FOUND";
        }
        if (p.startsAt() != null && now.isBefore(p.startsAt())) {
            return "NOT_STARTED";
        }
        if (p.endsAt() != null && !now.isBefore(p.endsAt())) {
            return "EXPIRED";
        }
        if (p.maxRedemptions() != null && p.redemptions() >= p.maxRedemptions()) {
            return "EXHAUSTED";
        }
        if (subtotal < p.minOrderMinor()) {
            return "MIN_ORDER";
        }
        return null;
    }

    static long percentOf(long amount, int percent) {
        return BigDecimal.valueOf(amount).multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValue();
    }
}
