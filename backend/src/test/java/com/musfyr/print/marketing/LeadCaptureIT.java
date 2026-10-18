package com.musfyr.print.marketing;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.musfyr.print.support.IntegrationTest;

@IntegrationTest
class LeadCaptureIT {

    @Autowired
    MockMvc mvc;

    private Cookie xsrf;

    @BeforeEach
    void csrf() throws Exception {
        xsrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
    }

    private MockHttpServletRequestBuilder postJson(String url, String body) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(body).cookie(xsrf)
                .header("X-XSRF-TOKEN", xsrf.getValue());
    }

    @Test
    void newsletterRequiresConsentAndIsIdempotent() throws Exception {
        mvc.perform(postJson("/api/v1/newsletter/subscriptions", "{\"email\":\"fan@example.com\",\"consent\":false}"))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/v1/newsletter/subscriptions", "{\"email\":\"fan@example.com\",\"consent\":true}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status", is("PENDING_CONFIRMATION")));
        mvc.perform(postJson("/api/v1/newsletter/subscriptions", "{\"email\":\"FAN@example.com\",\"consent\":true}"))
                .andExpect(status().isAccepted());
    }

    @Test
    void bulkQuoteIsStoredWithReference() throws Exception {
        mvc.perform(postJson("/api/v1/quotes", """
                        {"contactName":"Ola","email":"ola@example.com","company":"Acme","productInterest":"Pullover Hoodie",
                         "quantity":120,"message":"Team event"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reference", startsWith("Q-")))
                .andExpect(jsonPath("$.status", is("NEW")));
    }

    @Test
    void bulkQuoteBelowMinimumIsRejected() throws Exception {
        mvc.perform(postJson("/api/v1/quotes",
                        "{\"contactName\":\"A\",\"email\":\"a@example.com\",\"productInterest\":\"Tee\",\"quantity\":2}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("quantity")));
    }
}
