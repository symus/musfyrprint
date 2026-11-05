package com.musfyr.print.sizing;

import java.util.ArrayList;
import java.util.List;

import com.musfyr.print.sizing.SizingDtos.Confidence;
import com.musfyr.print.sizing.SizingDtos.FitPreference;
import com.musfyr.print.sizing.SizingDtos.Range;
import com.musfyr.print.sizing.SizingDtos.Recommendation;
import com.musfyr.print.sizing.SizingDtos.RecommendationRequest;
import com.musfyr.print.sizing.SizingDtos.SizeRow;

/**
 * Picks the size whose body-measurement ranges best fit the customer. Chest matters most for tops, then height,
 * then waist; age is used only when no height is given (children). Pure function – no I/O.
 */
public final class SizeRecommender {

    static final double CHEST_WEIGHT = 0.6;
    static final double HEIGHT_WEIGHT = 0.3;
    static final double WAIST_WEIGHT = 0.1;
    /** Within this many centimetres of a range the match is still considered good. */
    static final double NEAR_CM = 3;

    private SizeRecommender() {
    }

    public static Recommendation recommend(List<SizeRow> rows, RecommendationRequest m) {
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Size chart has no rows");
        }
        int best = -1;
        double bestScore = Double.MAX_VALUE;
        double bestMaxDistance = 0;
        for (int i = 0; i < rows.size(); i++) {
            Score s = score(rows.get(i), m);
            if (s.weight == 0) {
                continue;
            }
            double normalised = s.total / s.weight;
            // On a tie prefer the larger size: a slightly loose garment beats a tight one.
            if (normalised < bestScore || (normalised == bestScore && best >= 0)) {
                best = i;
                bestScore = normalised;
                bestMaxDistance = s.maxDistance;
            }
        }
        if (best < 0) {
            // None of the given measurements exist in this chart (e.g. only age for an adult chart).
            return new Recommendation(null, Confidence.LOW, null, List.of("NO_MATCHING_MEASUREMENTS"));
        }

        List<String> reasons = new ArrayList<>();
        Confidence confidence = bestMaxDistance == 0 ? Confidence.HIGH
                : bestMaxDistance <= NEAR_CM ? Confidence.MEDIUM : Confidence.LOW;
        reasons.add(bestMaxDistance == 0 ? "WITHIN_RANGE" : "NEAREST_MATCH");
        if (bestMaxDistance > 0 && best == 0 && below(rows.get(0), m)) {
            reasons.add("BELOW_CHART");
        }
        if (bestMaxDistance > 0 && best == rows.size() - 1 && above(rows.get(best), m)) {
            reasons.add("ABOVE_CHART");
        }

        int chosen = best;
        FitPreference fit = m.fit() == null ? FitPreference.REGULAR : m.fit();
        if (fit == FitPreference.LOOSER && chosen < rows.size() - 1) {
            chosen++;
            reasons.add("SIZED_UP_FOR_LOOSER_FIT");
        } else if (fit == FitPreference.CLOSER && chosen > 0 && inLowerHalf(rows.get(chosen), m)) {
            chosen--;
            reasons.add("SIZED_DOWN_FOR_CLOSER_FIT");
        }

        String alternative = null;
        if (fit == FitPreference.REGULAR && confidence != Confidence.HIGH) {
            int neighbour = above(rows.get(chosen), m) ? chosen + 1 : chosen - 1;
            if (neighbour >= 0 && neighbour < rows.size()) {
                alternative = rows.get(neighbour).sizeCode();
            }
        } else if (fit == FitPreference.REGULAR && chosen < rows.size() - 1 && inUpperQuarter(rows.get(chosen), m)) {
            alternative = rows.get(chosen + 1).sizeCode();
        }
        return new Recommendation(rows.get(chosen).sizeCode(), confidence, alternative, List.copyOf(reasons));
    }

    private record Score(double total, double weight, double maxDistance) {
    }

    private static Score score(SizeRow row, RecommendationRequest m) {
        double total = 0;
        double weight = 0;
        double maxDistance = 0;
        if (m.chestCm() != null && row.chest() != null) {
            double d = row.chest().distance(m.chestCm());
            total += CHEST_WEIGHT * d;
            weight += CHEST_WEIGHT;
            maxDistance = Math.max(maxDistance, d);
        }
        if (m.heightCm() != null && row.height() != null) {
            double d = row.height().distance(m.heightCm());
            total += HEIGHT_WEIGHT * d;
            weight += HEIGHT_WEIGHT;
            maxDistance = Math.max(maxDistance, d);
        }
        if (m.waistCm() != null && row.waist() != null) {
            double d = row.waist().distance(m.waistCm());
            total += WAIST_WEIGHT * d;
            weight += WAIST_WEIGHT;
            maxDistance = Math.max(maxDistance, d);
        }
        if (m.heightCm() == null && m.ageMonths() != null && row.ageMinMonths() != null && row.ageMaxMonths() != null) {
            Range age = new Range(java.math.BigDecimal.valueOf(row.ageMinMonths()), java.math.BigDecimal.valueOf(row.ageMaxMonths()));
            // One month of age counts like 1 cm so the confidence thresholds stay meaningful.
            double d = age.distance(m.ageMonths());
            total += HEIGHT_WEIGHT * d;
            weight += HEIGHT_WEIGHT;
            maxDistance = Math.max(maxDistance, d);
        }
        return new Score(total, weight, maxDistance);
    }

    private static boolean below(SizeRow row, RecommendationRequest m) {
        return (m.chestCm() != null && row.chest() != null && row.chest().min() != null && m.chestCm() < row.chest().min().doubleValue())
                || (m.heightCm() != null && row.height() != null && row.height().min() != null && m.heightCm() < row.height().min().doubleValue());
    }

    private static boolean above(SizeRow row, RecommendationRequest m) {
        return (m.chestCm() != null && row.chest() != null && row.chest().max() != null && m.chestCm() > row.chest().max().doubleValue())
                || (m.heightCm() != null && row.height() != null && row.height().max() != null && m.heightCm() > row.height().max().doubleValue());
    }

    private static double position(SizeRow row, RecommendationRequest m) {
        Range r = m.chestCm() != null && row.chest() != null ? row.chest() : row.height();
        Double v = m.chestCm() != null && row.chest() != null ? m.chestCm() : m.heightCm();
        if (r == null || v == null || r.min() == null || r.max() == null || r.max().equals(r.min())) {
            return 0.5;
        }
        return (v - r.min().doubleValue()) / (r.max().doubleValue() - r.min().doubleValue());
    }

    private static boolean inLowerHalf(SizeRow row, RecommendationRequest m) {
        return position(row, m) <= 0.5;
    }

    private static boolean inUpperQuarter(SizeRow row, RecommendationRequest m) {
        return position(row, m) >= 0.75;
    }
}
