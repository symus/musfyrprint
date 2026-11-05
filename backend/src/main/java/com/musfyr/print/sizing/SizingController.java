package com.musfyr.print.sizing;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.i18n.ContentLanguage;
import com.musfyr.print.sizing.SizingDtos.Recommendation;
import com.musfyr.print.sizing.SizingDtos.RecommendationRequest;
import com.musfyr.print.sizing.SizingDtos.SizeChart;

@RestController
@RequestMapping("/api/v1/catalog/products/{slug}")
@Tag(name = "Sizing")
@Validated
public class SizingController {

    private final SizeChartService charts;
    private final ContentLanguage language;

    public SizingController(SizeChartService charts, ContentLanguage language) {
        this.charts = charts;
        this.language = language;
    }

    @GetMapping("/size-chart")
    @Operation(summary = "Size chart with body ranges, garment measurements (cm) and EU/UK/US/CN/IN labels")
    public SizeChart sizeChart(@PathVariable @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug) {
        return charts.forProduct(slug, language.current());
    }

    @PostMapping("/size-recommendation")
    @Operation(summary = "Recommend a size from body measurements (cm)",
            description = "Example body: {\"heightCm\": 178, \"chestCm\": 98, \"fit\": \"REGULAR\"}")
    public Recommendation recommend(@PathVariable @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
                                    @Valid @RequestBody RecommendationRequest request) {
        return SizeRecommender.recommend(charts.forProduct(slug, language.current()).rows(), request);
    }
}
