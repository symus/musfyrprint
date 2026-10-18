package com.musfyr.print.catalog;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import com.musfyr.print.support.IntegrationTest;

@IntegrationTest
class CatalogApiIT {

    @Autowired
    MockMvc mvc;

    @Test
    void listsActiveProductsWithPagination() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()", is(5)))
                .andExpect(jsonPath("$.totalItems", greaterThan(15)))
                .andExpect(jsonPath("$.items[0].priceFrom.currency", is("PLN")))
                .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void filtersByCategoryColourAndSortsByPrice() throws Exception {
        mvc.perform(get("/api/v1/catalog/products")
                        .param("category", "t-shirts").param("color", "black").param("sort", "PRICE_ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].categorySlug", everyItem(is("t-shirts"))))
                .andExpect(jsonPath("$.items[0].slug", is("organic-tank-top")));
    }

    @Test
    void filtersByAgeGroupAndFamily() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("ageGroup", "baby"))
                .andExpect(jsonPath("$.items[*].ageGroup", everyItem(is("BABY"))));
        mvc.perform(get("/api/v1/catalog/products").param("family", "STICKER"))
                .andExpect(jsonPath("$.items[*].productFamily", everyItem(is("STICKER"))))
                .andExpect(jsonPath("$.totalItems", is(5)));
    }

    @Test
    void fullTextSearchToleratesPrefixesAndTypos() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("q", "hood").param("sort", "RELEVANCE"))
                .andExpect(jsonPath("$.items[*].slug", hasItem("pullover-hoodie")));
        mvc.perform(get("/api/v1/catalog/suggest").param("q", "hodie"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem("pullover-hoodie")));
    }

    @Test
    void searchInputCannotInjectTsQueryOperators() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("q", "tee & | ! :* ' ;--"))
                .andExpect(status().isOk());
    }

    @Test
    void productDetailIncludesConfigurationFromDatabase() throws Exception {
        mvc.perform(get("/api/v1/catalog/products/die-cut-vinyl-sticker"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.optionGroups[*].code", hasItem("finish")))
                .andExpect(jsonPath("$.printMethods[0].code", is("DIGITAL_STICKER")))
                .andExpect(jsonPath("$.printAreas[0].minDpi", is(300)))
                .andExpect(jsonPath("$.variants[0].availability", is("IN_STOCK")))
                .andExpect(jsonPath("$.variants[0].stockQuantity").doesNotExist());
    }

    @Test
    void unknownProductIsProblemJson404() throws Exception {
        mvc.perform(get("/api/v1/catalog/products/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title", is("Not Found")))
                .andExpect(jsonPath("$.correlationId").exists());
    }

    @Test
    void rejectsInvalidQueryParameters() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("size", "1000"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/catalog/products").param("category", "../etc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void homepageAggregatesSections() throws Exception {
        mvc.perform(get("/api/v1/storefront/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured.length()", greaterThan(0)))
                .andExpect(jsonPath("$.collections[*].slug", hasItem("family-matching")))
                .andExpect(jsonPath("$.promotions[*].code", hasItem("WELCOME10")));
    }

    @Test
    void staleSessionCookieDoesNotBreakPublicPages() throws Exception {
        mvc.perform(get("/api/v1/catalog/categories").cookie(new Cookie("mp_at", "garbage.token.value")))
                .andExpect(status().isOk());
    }

    @Test
    void returnsPolishContentForPolishAcceptLanguage() throws Exception {
        mvc.perform(get("/api/v1/catalog/products/pullover-hoodie").header("Accept-Language", "pl-PL,pl;q=0.9"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Vary", hasItem(org.hamcrest.Matchers.containsString("Accept-Language"))))
                .andExpect(jsonPath("$.name", is("Bluza z kapturem")))
                .andExpect(jsonPath("$.breadcrumbs[0].name", is("Bluzy")))
                .andExpect(jsonPath("$.colors[0].name", is("Czarny")))
                .andExpect(jsonPath("$.printAreas[0].name", is("Przód")));
        // English (base content) when no or an unsupported language is requested
        mvc.perform(get("/api/v1/catalog/products/pullover-hoodie").header("Accept-Language", "fr"))
                .andExpect(jsonPath("$.name", is("Pullover Hoodie")));
    }

    @Test
    void searchFindsProductsByPolishName() throws Exception {
        mvc.perform(get("/api/v1/catalog/products").param("q", "koszulka").header("Accept-Language", "pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].slug", hasItem("classic-unisex-tee")))
                .andExpect(jsonPath("$.items[0].categoryName", is("Koszulki")));
        mvc.perform(get("/api/v1/catalog/suggest").param("q", "naklejka").header("Accept-Language", "pl"))
                .andExpect(jsonPath("$[*].slug", hasItem("transparent-sticker")));
    }
}
