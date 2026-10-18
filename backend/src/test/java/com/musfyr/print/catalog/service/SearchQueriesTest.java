package com.musfyr.print.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchQueriesTest {

    @Test
    void buildsPrefixQueryFromWords() {
        assertThat(SearchQueries.prefixTsQuery("Baby  Bodysuit")).isEqualTo("baby:* & bodysuit:*");
    }

    @Test
    void stripsTsQueryOperatorsAndPunctuation() {
        assertThat(SearchQueries.prefixTsQuery("tee & | ! :* ' (x)")).isEqualTo("tee:* & x:*");
    }

    @Test
    void keepsUnicodeLetters() {
        assertThat(SearchQueries.prefixTsQuery("koszulka żółta")).isEqualTo("koszulka:* & żółta:*");
    }

    @Test
    void returnsNullWhenNothingSearchable() {
        assertThat(SearchQueries.prefixTsQuery(" &&& ")).isNull();
        assertThat(SearchQueries.prefixTsQuery(null)).isNull();
    }

    @Test
    void escapesLikeWildcards() {
        assertThat(SearchQueries.likePattern("50%_off")).isEqualTo("%50\\%\\_off%");
    }
}
