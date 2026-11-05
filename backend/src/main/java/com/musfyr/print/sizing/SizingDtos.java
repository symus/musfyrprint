package com.musfyr.print.sizing;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public final class SizingDtos {

    /** Regional systems the storefront can display. Labels are stored per chart row, never converted. */
    public static final List<String> SYSTEMS = List.of("EU", "UK", "US", "CN", "IN");

    private SizingDtos() {
    }

    public record Range(BigDecimal min, BigDecimal max) {
        static Range of(BigDecimal min, BigDecimal max) {
            return min == null && max == null ? null : new Range(min, max);
        }

        boolean contains(double v) {
            return (min == null || v >= min.doubleValue()) && (max == null || v <= max.doubleValue());
        }

        /** Distance in cm from the nearest edge of the range (0 when inside). */
        double distance(double v) {
            if (min != null && v < min.doubleValue()) {
                return min.doubleValue() - v;
            }
            if (max != null && v > max.doubleValue()) {
                return v - max.doubleValue();
            }
            return 0;
        }
    }

    public record SizeRow(String sizeCode, Integer ageMinMonths, Integer ageMaxMonths, Range height, Range chest,
                          Range waist, BigDecimal garmentWidth, BigDecimal garmentLength, Map<String, String> labels) {
    }

    /** source REFERENCE means generic industry ranges, not measurements from the actual supplier. */
    public record SizeChart(String source, String supplierName, String fitNote, List<String> systems,
                            List<SizeRow> rows) {
    }

    public enum FitPreference { CLOSER, REGULAR, LOOSER }

    public record RecommendationRequest(
            @DecimalMin("40") @DecimalMax("230") Double heightCm,
            @DecimalMin("30") @DecimalMax("200") Double chestCm,
            @DecimalMin("30") @DecimalMax("200") Double waistCm,
            @Min(0) @Max(240) Integer ageMonths,
            FitPreference fit) {

        @AssertTrue(message = "Provide at least height, chest or age")
        public boolean isAnyMeasurementGiven() {
            return heightCm != null || chestCm != null || ageMonths != null;
        }
    }

    public enum Confidence { HIGH, MEDIUM, LOW }

    /**
     * Reasons are codes so each storefront language can phrase them:
     * WITHIN_RANGE, NEAREST_MATCH, BELOW_CHART, ABOVE_CHART, SIZED_UP_FOR_LOOSER_FIT, SIZED_DOWN_FOR_CLOSER_FIT.
     */
    public record Recommendation(String sizeCode, Confidence confidence, String alternativeSizeCode,
                                 List<String> reasons) {
    }
}
