package com.musfyr.print.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.musfyr.print.support.IntegrationTest;
import com.musfyr.print.support.TestDatabaseConfig;

@IntegrationTest
class AccountFlowIT {

    @Autowired
    MockMvc mvc;

    private Cookie xsrf;

    @BeforeEach
    void csrf() throws Exception {
        xsrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body, Cookie... extra) {
        b.contentType(MediaType.APPLICATION_JSON).content(body).cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue());
        for (Cookie c : extra) {
            b.cookie(c);
        }
        return b;
    }

    private String linkToken(String email) {
        var mail = TestDatabaseConfig.SENT.reversed().stream().filter(e -> e.to().equals(email)).findFirst().orElseThrow();
        return mail.text().replaceAll("(?s).*token=([A-Za-z0-9_-]+).*", "$1");
    }

    @Test
    void registerVerifyResetPasswordAndManageProfile() throws Exception {
        String email = "nowy" + System.nanoTime() + "@example.com";
        var reg = mvc.perform(json(post("/api/v1/auth/register"), """
                        {"email":"%s","password":"Haslo-Testowe-123","displayName":"Nowy Klient","acceptTerms":true,"locale":"pl"}""".formatted(email)))
                .andExpect(status().isCreated()).andReturn();
        Cookie session = reg.getResponse().getCookie("mp_at");
        mvc.perform(get("/api/v1/account/profile").cookie(session))
                .andExpect(jsonPath("$.emailVerified", is(false))).andExpect(jsonPath("$.roles[0]", is("CUSTOMER")));
        assertThat(TestDatabaseConfig.SENT.getLast().subject()).startsWith("Potwierdź adres e-mail");

        mvc.perform(json(post("/api/v1/auth/verify-email"), "{\"token\":\"" + linkToken(email) + "\"}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/account/profile").cookie(session)).andExpect(jsonPath("$.emailVerified", is(true)));

        // duplicate registration, weak password
        mvc.perform(json(post("/api/v1/auth/register"), """
                        {"email":"%s","password":"Haslo-Testowe-123","displayName":"X","acceptTerms":true}""".formatted(email)))
                .andExpect(status().isConflict());
        mvc.perform(json(post("/api/v1/auth/register"), """
                        {"email":"x%s","password":"short","displayName":"X","acceptTerms":true}""".formatted(email)))
                .andExpect(status().isBadRequest());

        // password reset: unknown e-mail gets the same answer and no mail
        int before = TestDatabaseConfig.SENT.size();
        mvc.perform(json(post("/api/v1/auth/password-reset/request"), "{\"email\":\"ghost@example.com\"}")).andExpect(status().isAccepted());
        assertThat(TestDatabaseConfig.SENT).hasSize(before);
        mvc.perform(json(post("/api/v1/auth/password-reset/request"), "{\"email\":\"" + email + "\",\"locale\":\"en\"}")).andExpect(status().isAccepted());
        String resetToken = linkToken(email);
        mvc.perform(json(post("/api/v1/auth/password-reset/confirm"), "{\"token\":\"" + resetToken + "\",\"password\":\"Nowe-Haslo-456\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(json(post("/api/v1/auth/password-reset/confirm"), "{\"token\":\"" + resetToken + "\",\"password\":\"Inne-Haslo-789\"}"))
                .andExpect(status().isUnprocessableContent());
        var login = mvc.perform(json(post("/api/v1/auth/login"), "{\"email\":\"" + email + "\",\"password\":\"Nowe-Haslo-456\"}"))
                .andExpect(status().isOk()).andReturn();
        session = login.getResponse().getCookie("mp_at");

        // profile and addresses
        mvc.perform(json(put("/api/v1/account/profile"), "{\"displayName\":\"Anna\",\"phone\":\"+48 600 000 000\",\"marketingOptIn\":true,\"preferredSizeSystem\":\"EU\",\"preferredLocale\":\"pl\"}", session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.preferredSizeSystem", is("EU")));
        String list = mvc.perform(json(post("/api/v1/account/addresses"), """
                        {"fullName":"Anna","line1":"ul. Polna 2","postalCode":"30-001","city":"Kraków","country":"PL"}""", session))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].isDefault", is(true)))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(list, "$[0].id");
        mvc.perform(json(post("/api/v1/account/addresses"), """
                        {"fullName":"Anna","line1":"ul. Polna 2","postalCode":"30001","city":"Kraków","country":"PL"}""", session))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/account/addresses/" + id).cookie(session).cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/v1/account/orders").cookie(session)).andExpect(status().isOk());
        mvc.perform(json(post("/api/v1/account/deletion-request"), "{}", session)).andExpect(status().isAccepted());
    }

    @Test
    void accountEndpointsRequireSignIn() throws Exception {
        mvc.perform(get("/api/v1/account/profile")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/account/orders")).andExpect(status().isUnauthorized());
    }
}
