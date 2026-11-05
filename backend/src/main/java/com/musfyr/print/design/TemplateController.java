package com.musfyr.print.design;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.i18n.ContentLanguage;

@RestController
@Tag(name = "Design templates")
@Validated
public class TemplateController {

    private final TemplateService templates;
    private final ContentLanguage language;

    public TemplateController(TemplateService templates, ContentLanguage language) {
        this.templates = templates;
        this.language = language;
    }

    @GetMapping("/api/v1/design-templates")
    @Operation(summary = "Approved templates for the design studio")
    public List<TemplateService.TemplateView> approved(
            @RequestParam(defaultValue = "ANY") @Pattern(regexp = "APPAREL|STICKER|MERCH|ANY") String family) {
        return templates.approved(language.current(), "MERCH".equals(family) ? "APPAREL" : family);
    }

    @GetMapping("/api/v1/admin/design-templates")
    public List<TemplateService.AdminTemplate> all() {
        return templates.all();
    }

    @PostMapping("/api/v1/admin/design-templates")
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@Valid @RequestBody TemplateService.TemplateRequest request) {
        templates.create(request);
    }

    @PostMapping("/api/v1/admin/design-templates/{id}/status")
    @Operation(summary = "Approve, unpublish (DRAFT) or retire a template")
    public void status(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        templates.changeStatus(id, request.status());
    }

    public record StatusRequest(@NotBlank String status) {
    }
}
