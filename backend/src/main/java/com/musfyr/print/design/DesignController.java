package com.musfyr.print.design;

import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/designs")
@Tag(name = "Designs")
public class DesignController {

    public static final String TOKEN_HEADER = "X-Design-Token";

    private final DesignService designs;

    public DesignController(DesignService designs) {
        this.designs = designs;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Save a new design draft", description = "Returns an edit token – keep it to load or update the design.")
    public DesignService.Created create(@Valid @RequestBody DesignService.DesignRequest request) {
        return designs.create(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Load a design (requires its edit token)")
    public DesignService.DesignView get(@PathVariable UUID id, @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        return designs.get(id, token);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a design draft (requires its edit token and current version)")
    public DesignService.DesignView update(@PathVariable UUID id,
                                           @RequestHeader(value = TOKEN_HEADER, required = false) String token,
                                           @Valid @RequestBody DesignService.DesignRequest request) {
        return designs.update(id, token, request);
    }
}
