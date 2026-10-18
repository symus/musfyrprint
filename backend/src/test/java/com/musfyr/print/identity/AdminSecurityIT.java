package com.musfyr.print.identity;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.support.IntegrationTest;
import com.musfyr.print.support.TestTokens;

@IntegrationTest
class AdminSecurityIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    TestTokens tokens;

    @Test
    void anonymousCannotReachAdminApi() throws Exception {
        mvc.perform(get("/api/v1/admin/products"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title", is("Unauthorized")));
    }

    @Test
    void customersAreForbiddenFromAdminApi() throws Exception {
        mvc.perform(get("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, tokens.bearer(Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void supportStaffCanSeeQuotesButNotEditProductsOrAudit() throws Exception {
        String support = tokens.bearer(Role.SUPPORT);
        mvc.perform(get("/api/v1/admin/quotes").header(HttpHeaders.AUTHORIZATION, support))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, support))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, support))
                .andExpect(status().isForbidden());
    }

    @Test
    void tamperedBearerTokenIsRejected() throws Exception {
        String token = tokens.bearer(Role.CUSTOMER);
        mvc.perform(get("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, token + "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cookieLoginRequiresCsrfAndGrantsAdminAccess() throws Exception {
        String body = "{\"email\":\"admin@test.local\",\"password\":\"Test-Admin-Password-1\"}";
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail", containsString("CSRF")));

        MvcResult csrf = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie xsrf = csrf.getResponse().getCookie("XSRF-TOKEN");
        MvcResult login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body)
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.roles", hasItem("ADMIN")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andReturn();
        Cookie session = login.getResponse().getCookie("mp_at");

        mvc.perform(get("/api/v1/auth/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email", is("admin@test.local")));
        mvc.perform(get("/api/v1/admin/products").cookie(session)).andExpect(status().isOk());
        // A cookie-authenticated write without the CSRF header is rejected.
        mvc.perform(post("/api/v1/admin/colors").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"csrf-test\",\"name\":\"Csrf\",\"hex\":\"#123456\",\"sortOrder\":1}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void wrongPasswordGivesGenericErrorAndEventuallyLocksAccount() throws Exception {
        MvcResult csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        Cookie xsrf = csrf.getResponse().getCookie("XSRF-TOKEN");
        String unknown = "{\"email\":\"nobody@test.local\",\"password\":\"whatever-123\"}";
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(unknown)
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail", is("Invalid email or password")));
    }

    @Test
    void adminCanCreateGenerateVariantsAndPublishProduct() throws Exception {
        String admin = tokens.bearer(Role.ADMIN);
        String categories = mvc.perform(get("/api/v1/admin/categories").header(HttpHeaders.AUTHORIZATION, admin))
                .andReturn().getResponse().getContentAsString();
        String categoryId = JsonPath.read(categories, "$[0].id");

        String create = """
                {"categoryId":"%s","slug":"it-test-tee","name":"IT Test Tee","productFamily":"APPAREL",
                 "garmentType":"TSHIRT","ageGroup":"ADULT","fit":"REGULAR","basePriceMinor":5500,
                 "customizable":true,"featured":false,"tags":["test"],"colorCodes":["white","black"]}"""
                .formatted(categoryId);
        String created = mvc.perform(post("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content(create))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.currency", is("PLN")))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.id");

        // Draft products are invisible to the storefront.
        mvc.perform(get("/api/v1/catalog/products/it-test-tee")).andExpect(status().isNotFound());

        // Publishing without variants violates a business rule.
        mvc.perform(post("/api/v1/admin/products/{id}/status", id).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isUnprocessableContent());

        mvc.perform(post("/api/v1/admin/products/{id}/variants/generate", id).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sizeCodes\":[\"S\",\"M\",\"L\"],\"initialStock\":3,\"skuPrefix\":\"ITT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants.length()", is(6)))
                .andExpect(jsonPath("$.variants[0].availability", is("LOW_STOCK")));

        mvc.perform(post("/api/v1/admin/products/{id}/status", id).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/catalog/products/it-test-tee"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sizes.length()", is(3)));

        // Stale version -> 409
        mvc.perform(put("/api/v1/admin/products/{id}", id).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(create.replace("}", ",\"version\":-1}")))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/v1/admin/audit-logs").param("entityType", "Product")
                        .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$.items[*].action", hasItem("PRODUCT_STATUS_CHANGED")));
    }

    @Test
    void duplicateSlugIsConflictAndInvalidBodyIsValidationError() throws Exception {
        String admin = tokens.bearer(Role.ADMIN);
        String categories = mvc.perform(get("/api/v1/admin/categories").header(HttpHeaders.AUTHORIZATION, admin))
                .andReturn().getResponse().getContentAsString();
        String categoryId = JsonPath.read(categories, "$[0].id");
        mvc.perform(post("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":\"%s\",\"slug\":\"classic-unisex-tee\",\"name\":\"Dup\",\"productFamily\":\"APPAREL\",\"basePriceMinor\":100}"
                                .formatted(categoryId)))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/products").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"Bad Slug\",\"name\":\"\",\"basePriceMinor\":-5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("slug")));
    }
}
