package com.musfyr.print.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.musfyr.print.commerce.PriceCalculator.LineInput;
import com.musfyr.print.commerce.PriceCalculator.Promotion;
import com.musfyr.print.commerce.PriceCalculator.Shipping;
import com.musfyr.print.commerce.PriceCalculator.Tier;

class PriceCalculatorTest {

    static final Instant NOW = Instant.parse("2026-11-05T12:00:00Z");
    static final ShopProperties.Tax EXEMPT = new ShopProperties.Tax("EXEMPT", BigDecimal.valueOf(23));
    static final ShopProperties.Tax VAT23 = new ShopProperties.Tax("STANDARD", BigDecimal.valueOf(23));
    static final List<Tier> TIERS = List.of(new Tier(10, 5), new Tier(25, 10), new Tier(50, 15));
    static final Shipping LOCKER = new Shipping("INPOST_LOCKER", 1499);

    static Promotion promo(String type, long value, long min) {
        return new Promotion("CODE", type, value, min, NOW.minusSeconds(60), NOW.plusSeconds(3600), true, null, 0);
    }

    @Test
    void unitPriceAddsOptionsPrintMethodAndPrintAreaFees() {
        // tee 59 zł + back print 15 zł; sticker 29 zł + holographic 8 zł
        var q = PriceCalculator.calculate(List.of(
                new LineInput("tee", 5900, 0, 0, 1500, 2),
                new LineInput("sticker", 2900, 800, 0, 0, 1)), TIERS, null, null, LOCKER, EXEMPT, NOW);
        assertThat(q.lines()).extracting("unitPriceMinor").containsExactly(7400L, 3700L);
        assertThat(q.subtotalMinor()).isEqualTo(2 * 7400 + 3700);
        assertThat(q.totalMinor()).isEqualTo(18500 + 1499);
        assertThat(q.taxIncludedMinor()).isZero();
    }

    @Test
    void volumeDiscountUsesTheHighestReachedTier() {
        var q = PriceCalculator.calculate(List.of(new LineInput("tee", 5900, 0, 0, 0, 30)), TIERS, null, null, null, EXEMPT, NOW);
        var line = q.lines().getFirst();
        assertThat(line.volumePercent()).isEqualTo(10);
        assertThat(line.volumeDiscountMinor()).isEqualTo(17700); // 10 % of 177 000
        assertThat(q.totalMinor()).isEqualTo(159300);
    }

    @Test
    void percentAndFixedPromotionsAndTheirLimits() {
        var lines = List.of(new LineInput("tee", 5900, 0, 0, 0, 1));
        assertThat(PriceCalculator.calculate(lines, TIERS, promo("PERCENT", 10, 0), "CODE", LOCKER, EXEMPT, NOW).discountMinor()).isEqualTo(590);
        assertThat(PriceCalculator.calculate(lines, TIERS, promo("FIXED", 10000, 0), "CODE", LOCKER, EXEMPT, NOW).discountMinor()).isEqualTo(5900);
        var tooSmall = PriceCalculator.calculate(lines, TIERS, promo("PERCENT", 10, 19900), "CODE", LOCKER, EXEMPT, NOW);
        assertThat(tooSmall.promotionError()).isEqualTo("MIN_ORDER");
        assertThat(tooSmall.discountMinor()).isZero();
        assertThat(tooSmall.promotionCode()).isNull();
    }

    @Test
    void freeShippingPromotionAndUnknownCodes() {
        var lines = List.of(new LineInput("hoodie", 14900, 0, 0, 0, 2));
        var q = PriceCalculator.calculate(lines, TIERS, promo("FREE_SHIPPING", 0, 19900), "CODE", LOCKER, EXEMPT, NOW);
        assertThat(q.shippingMinor()).isZero();
        assertThat(q.totalMinor()).isEqualTo(29800);
        assertThat(PriceCalculator.calculate(lines, TIERS, null, "NOPE", LOCKER, EXEMPT, NOW).promotionError()).isEqualTo("NOT_FOUND");
    }

    @Test
    void expiredExhaustedAndFuturePromotionsAreRejected() {
        var lines = List.of(new LineInput("tee", 5900, 0, 0, 0, 1));
        var expired = new Promotion("C", "PERCENT", 10, 0, null, NOW.minusSeconds(1), true, null, 0);
        var exhausted = new Promotion("C", "PERCENT", 10, 0, null, null, true, 5, 5);
        var future = new Promotion("C", "PERCENT", 10, 0, NOW.plusSeconds(10), null, true, null, 0);
        assertThat(PriceCalculator.calculate(lines, TIERS, expired, "C", null, EXEMPT, NOW).promotionError()).isEqualTo("EXPIRED");
        assertThat(PriceCalculator.calculate(lines, TIERS, exhausted, "C", null, EXEMPT, NOW).promotionError()).isEqualTo("EXHAUSTED");
        assertThat(PriceCalculator.calculate(lines, TIERS, future, "C", null, EXEMPT, NOW).promotionError()).isEqualTo("NOT_STARTED");
    }

    @Test
    void standardVatIsReportedAsIncludedInTheGrossTotal() {
        // 123.00 gross at 23 % contains 23.00 VAT
        var q = PriceCalculator.calculate(List.of(new LineInput("x", 12300, 0, 0, 0, 1)), TIERS, null, null, null, VAT23, NOW);
        assertThat(q.totalMinor()).isEqualTo(12300);
        assertThat(q.taxIncludedMinor()).isEqualTo(2300);
    }

    @Test
    void emptyCartCostsNothing() {
        var q = PriceCalculator.calculate(List.of(), TIERS, null, null, LOCKER, EXEMPT, NOW);
        assertThat(q.totalMinor()).isZero();
        assertThat(q.shippingMinor()).isZero();
    }
}
