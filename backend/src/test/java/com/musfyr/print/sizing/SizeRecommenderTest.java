package com.musfyr.print.sizing;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.musfyr.print.sizing.SizingDtos.Confidence;
import com.musfyr.print.sizing.SizingDtos.FitPreference;
import com.musfyr.print.sizing.SizingDtos.Range;
import com.musfyr.print.sizing.SizingDtos.RecommendationRequest;
import com.musfyr.print.sizing.SizingDtos.SizeRow;

class SizeRecommenderTest {

    private static Range r(double a, double b) {
        return new Range(BigDecimal.valueOf(a), BigDecimal.valueOf(b));
    }

    private static SizeRow row(String size, double h1, double h2, double c1, double c2) {
        return new SizeRow(size, null, null, r(h1, h2), r(c1, c2), null, null, null, Map.of());
    }

    private static final List<SizeRow> ADULT = List.of(
            row("S", 164, 172, 88, 93), row("M", 170, 178, 94, 101), row("L", 176, 184, 102, 109), row("XL", 180, 188, 110, 117));

    private static RecommendationRequest req(Double h, Double c, FitPreference fit) {
        return new RecommendationRequest(h, c, null, null, fit);
    }

    @Test
    void picksSizeWhenMeasurementsFitTheRanges() {
        var rec = SizeRecommender.recommend(ADULT, req(175.0, 97.0, null));
        assertThat(rec.sizeCode()).isEqualTo("M");
        assertThat(rec.confidence()).isEqualTo(Confidence.HIGH);
        assertThat(rec.reasons()).containsExactly("WITHIN_RANGE");
    }

    @Test
    void chestOutweighsHeight() {
        // Tall but slim: height alone says L/XL, chest says S. Chest weighs more, so the result is M, not L.
        assertThat(SizeRecommender.recommend(ADULT, req(182.0, 92.0, null)).sizeCode()).isEqualTo("M");
    }

    @Test
    void betweenSizesRoundsUpWithMediumConfidenceAndAnAlternative() {
        // 101.5 cm sits exactly between M (to 101) and L (from 102): a slightly loose fit beats a tight one.
        var rec = SizeRecommender.recommend(ADULT, req(null, 101.5, null));
        assertThat(rec.sizeCode()).isEqualTo("L");
        assertThat(rec.confidence()).isEqualTo(Confidence.MEDIUM);
        assertThat(rec.alternativeSizeCode()).isEqualTo("M");
    }

    @Test
    void fitPreferenceShiftsTheSize() {
        assertThat(SizeRecommender.recommend(ADULT, req(175.0, 97.0, FitPreference.LOOSER)).sizeCode()).isEqualTo("L");
        assertThat(SizeRecommender.recommend(ADULT, req(null, 95.0, FitPreference.CLOSER)).sizeCode()).isEqualTo("S");
        // Upper half of M: sizing down would be too tight, so it stays M.
        assertThat(SizeRecommender.recommend(ADULT, req(null, 100.0, FitPreference.CLOSER)).sizeCode()).isEqualTo("M");
    }

    @Test
    void flagsMeasurementsOutsideTheChart() {
        var big = SizeRecommender.recommend(ADULT, req(null, 130.0, null));
        assertThat(big.sizeCode()).isEqualTo("XL");
        assertThat(big.confidence()).isEqualTo(Confidence.LOW);
        assertThat(big.reasons()).contains("ABOVE_CHART");
        assertThat(SizeRecommender.recommend(ADULT, req(null, 70.0, null)).reasons()).contains("BELOW_CHART");
    }

    @Test
    void usesAgeForChildrenWhenNoHeightIsGiven() {
        List<SizeRow> baby = List.of(
                new SizeRow("0-3M", 0, 3, r(56, 62), null, null, null, null, Map.of()),
                new SizeRow("3-6M", 3, 6, r(62, 68), null, null, null, null, Map.of()),
                new SizeRow("6-12M", 6, 12, r(68, 80), null, null, null, null, Map.of()));
        assertThat(SizeRecommender.recommend(baby, new RecommendationRequest(null, null, null, 8, null)).sizeCode()).isEqualTo("6-12M");
        // Height beats age when both are given.
        assertThat(SizeRecommender.recommend(baby, new RecommendationRequest(64.0, null, null, 8, null)).sizeCode()).isEqualTo("3-6M");
    }

    @Test
    void reportsWhenNoGivenMeasurementExistsInTheChart() {
        var rec = SizeRecommender.recommend(ADULT, new RecommendationRequest(null, null, null, 30, null));
        assertThat(rec.sizeCode()).isNull();
        assertThat(rec.reasons()).containsExactly("NO_MATCHING_MEASUREMENTS");
    }
}
