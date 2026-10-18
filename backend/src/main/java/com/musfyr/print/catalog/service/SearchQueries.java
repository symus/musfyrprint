package com.musfyr.print.catalog.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/** Helpers that turn free-text input into safe PostgreSQL full-text queries. */
final class SearchQueries {

    private static final int MAX_TERMS = 6;

    private SearchQueries() {
    }

    /**
     * Builds a prefix tsquery such as {@code "red:* & hoodie:*"}. Tokens are reduced to Unicode letters and digits,
     * so user input can never inject tsquery operators. Returns null when nothing searchable remains.
     */
    static String prefixTsQuery(String input) {
        if (input == null) {
            return null;
        }
        String query = Arrays.stream(input.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(t -> !t.isBlank())
                .limit(MAX_TERMS)
                .map(t -> t + ":*")
                .collect(Collectors.joining(" & "));
        return query.isEmpty() ? null : query;
    }

    static String likePattern(String input) {
        String escaped = input.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
