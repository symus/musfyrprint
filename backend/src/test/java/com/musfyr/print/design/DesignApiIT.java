package com.musfyr.print.design;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.support.IntegrationTest;
import com.musfyr.print.support.TestTokens;

@IntegrationTest
class DesignApiIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    TestTokens tokens;

    private Cookie xsrf;

    @BeforeEach
    void csrf() throws Exception {
        xsrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
    }

    private String upload(byte[] bytes, String name) throws Exception {
        return mvc.perform(multipart("/api/v1/artworks").file(new MockMultipartFile("file", name, "image/png", bytes))
                        .param("rightsConfirmed", "true").cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void uploadRequiresRightsConfirmationAndRealImages() throws Exception {
        byte[] png = UploadSafetyTest.png(64, 64);
        mvc.perform(multipart("/api/v1/artworks").file(new MockMultipartFile("file", "a.png", "image/png", png))
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code", is("RIGHTS_NOT_CONFIRMED")));
        mvc.perform(multipart("/api/v1/artworks").file(new MockMultipartFile("file", "evil.png", "image/png", "<html>".getBytes()))
                        .param("rightsConfirmed", "true").cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code", is("UNSUPPORTED_TYPE")));
    }

    @Test
    void uploadedArtworkIsServedWithSafeHeaders() throws Exception {
        String body = upload(UploadSafetyTest.png(640, 480), "logo.png");
        String url = JsonPath.read(body, "$.url");
        mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/png"))
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.containsString("sandbox")));
    }

    @Test
    void designLifecycleWithEditTokenVersioningAndPrintWarnings() throws Exception {
        String art = upload(UploadSafetyTest.png(600, 600), "photo.png");
        String artId = JsonPath.read(art, "$.id");
        String doc = """
                {"productSlug":"classic-unisex-tee","colorCode":"black","sizeCode":"M","name":"My tee","document":
                 {"version":1,"zones":{"FRONT":{"canvasWidth":600,"canvasHeight":800,"objects":[
                   {"type":"image","artworkId":"%s","src":"/api/v1/artworks/%s/content","left":300,"top":400,
                    "width":600,"height":600,"scaleX":0.9,"scaleY":0.9}]}}}}""".formatted(artId, artId);
        String created = mvc.perform(post("/api/v1/designs").contentType(MediaType.APPLICATION_JSON).content(doc)
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isCreated())
                // 600 px shown 270 mm wide = 56 DPI on a 150 DPI area
                .andExpect(jsonPath("$.design.warnings[0].code", is("LOW_RESOLUTION")))
                .andExpect(jsonPath("$.design.warnings[0].severity", is("ERROR")))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.design.id");
        String token = JsonPath.read(created, "$.editToken");

        mvc.perform(get("/api/v1/designs/{id}", id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/designs/{id}", id).header("X-Design-Token", "wrong")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/designs/{id}", id).header("X-Design-Token", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name", is("My tee"))).andExpect(jsonPath("$.version", is(0)));

        String smaller = doc.replace("0.9", "0.3").replace("\"name\":\"My tee\"", "\"name\":\"My tee v2\"")
                .replace("}}}}", "}}},\"version\":0}");
        mvc.perform(put("/api/v1/designs/{id}", id).header("X-Design-Token", token).contentType(MediaType.APPLICATION_JSON)
                        .content(smaller).cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version", is(1)))
                .andExpect(jsonPath("$.warnings.length()", is(0))); // 600 px printed 90 mm wide = 169 DPI: fine
        mvc.perform(put("/api/v1/designs/{id}", id).header("X-Design-Token", token).contentType(MediaType.APPLICATION_JSON)
                        .content(smaller).cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isConflict());
    }

    @Test
    void designsCannotReferenceForeignImagesOrUnavailableOptions() throws Exception {
        String foreign = """
                {"productSlug":"classic-unisex-tee","document":{"version":1,"zones":{"FRONT":{"canvasWidth":600,"canvasHeight":800,
                 "objects":[{"type":"image","artworkId":"11111111-2222-3333-4444-555555555555","src":"https://evil.example/a.png","width":10,"height":10}]}}}}""";
        mvc.perform(post("/api/v1/designs").contentType(MediaType.APPLICATION_JSON).content(foreign)
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isUnprocessableContent());
        String badColour = """
                {"productSlug":"classic-unisex-tee","colorCode":"baby-pink","document":{"version":1,"zones":{}}}""";
        mvc.perform(post("/api/v1/designs").contentType(MediaType.APPLICATION_JSON).content(badColour)
                        .cookie(xsrf).header("X-XSRF-TOKEN", xsrf.getValue()))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void approvedTemplatesAreLocalisedAndManagedByDesigners() throws Exception {
        mvc.perform(get("/api/v1/design-templates").param("family", "APPAREL").header("Accept-Language", "pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("Urodzinowa gwiazda")))
                .andExpect(jsonPath("$[0].document.version", is(1)));
        mvc.perform(get("/api/v1/admin/design-templates").header(HttpHeaders.AUTHORIZATION, tokens.bearer(Role.SUPPORT)))
                .andExpect(status().isForbidden());
        String designer = tokens.bearer(Role.DESIGNER);
        String all = mvc.perform(get("/api/v1/admin/design-templates").header(HttpHeaders.AUTHORIZATION, designer))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(all, "$[0].id");
        mvc.perform(post("/api/v1/admin/design-templates/{id}/status", id).header(HttpHeaders.AUTHORIZATION, designer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RETIRED\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/design-templates").header(HttpHeaders.AUTHORIZATION, designer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"bad\",\"category\":\"FUNNY\",\"name\":\"Bad\",\"family\":\"ANY\",\"document\":{\"version\":1,\"objects\":[{\"type\":\"text\",\"x\":2,\"y\":0.5}]}}"))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(post("/api/v1/admin/design-templates/{id}/status", id).header(HttpHeaders.AUTHORIZATION, designer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk());
    }
}
