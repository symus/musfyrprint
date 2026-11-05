package com.musfyr.print.design;

import java.time.Duration;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import com.musfyr.print.common.error.ApiExceptionHandler;

@RestController
@Tag(name = "Artwork uploads")
public class ArtworkController {

    private final ArtworkService artworks;

    public ArtworkController(ArtworkService artworks) {
        this.artworks = artworks;
    }

    @PostMapping(path = "/api/v1/artworks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload artwork (PNG, JPG or SVG, max 10 MB)",
            description = "Multipart fields: file, rightsConfirmed=true. Returns pixel size for print-resolution checks.")
    public ArtworkService.ArtworkView upload(@RequestParam("file") MultipartFile file,
                                             @RequestParam(defaultValue = "false") boolean rightsConfirmed) {
        return artworks.upload(file, rightsConfirmed);
    }

    /**
     * Serves uploaded artwork. IDs are random UUIDs (capability URLs). SVGs are sandboxed so they can never run
     * script even when opened directly.
     */
    @GetMapping("/api/v1/artworks/{id}/content")
    public ResponseEntity<byte[]> content(@PathVariable UUID id) {
        ArtworkService.ArtworkContent c = artworks.content(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(c.mimeType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable())
                .header("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(c.bytes());
    }

    @ExceptionHandler(UploadRejectedException.class)
    ResponseEntity<ProblemDetail> rejected(UploadRejectedException ex) {
        ProblemDetail pd = ApiExceptionHandler.problem(HttpStatus.UNPROCESSABLE_CONTENT, "Upload Rejected", ex.getMessage());
        pd.setProperty("code", ex.getCode());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT).body(pd);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ProblemDetail> tooLarge() {
        ProblemDetail pd = ApiExceptionHandler.problem(HttpStatus.PAYLOAD_TOO_LARGE, "Upload Rejected", "Files can be up to 10 MB");
        pd.setProperty("code", "TOO_LARGE");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(pd);
    }
}
