package com.musfyr.print.design;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.BusinessRuleException;

class DesignCheckerTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    // Front print area 300 x 400 mm, 5 mm safe margin, 150 DPI minimum; canvas 600 x 800 units => 0.5 mm per unit.
    private static final Map<String, DesignChecker.AreaSpec> AREAS = Map.of("FRONT", new DesignChecker.AreaSpec(300, 400, 5, 150));
    private static final UUID ART = UUID.fromString("11111111-2222-3333-4444-555555555555");

    private static JsonNode doc(String objects) {
        return JSON.readTree("{\"version\":1,\"zones\":{\"FRONT\":{\"canvasWidth\":600,\"canvasHeight\":800,\"objects\":[" + objects + "]}}}");
    }

    private static String image(double left, double top, double scale) {
        return "{\"type\":\"image\",\"artworkId\":\"" + ART + "\",\"src\":\"https://shop.example/api/v1/artworks/" + ART
                + "/content\",\"left\":" + left + ",\"top\":" + top + ",\"width\":1000,\"height\":1000,\"scaleX\":" + scale
                + ",\"scaleY\":" + scale + ",\"originX\":\"center\",\"originY\":\"center\"}";
    }

    private static DesignChecker.Result check(JsonNode d, int pxWidth) {
        return DesignChecker.check(d, AREAS, id -> new DesignChecker.ArtworkPixels(pxWidth, pxWidth, false));
    }

    @Test
    void sharpImageInsideTheSafeAreaHasNoWarnings() {
        // 1000 px shown at 0.3 scale = 300 units = 150 mm wide -> 169 DPI
        var r = check(doc(image(300, 400, 0.3)), 1000);
        assertThat(r.warnings()).isEmpty();
        assertThat(r.artworkIds()).containsExactly(ART);
    }

    @Test
    void enlargedImageIsFlaggedWithItsEffectiveDpi() {
        // 1000 units * 0.5 = 500 units = 250 mm wide: 1000 px -> 102 DPI (below 150: warning)
        var warn = check(doc(image(300, 400, 0.5)), 1000).warnings();
        assertThat(warn).extracting("code", "severity", "value").containsExactly(org.assertj.core.groups.Tuple.tuple("LOW_RESOLUTION", "WARNING", 102));
        // same placement with a 400 px image -> 41 DPI (below half the minimum: error)
        assertThat(check(doc(image(300, 400, 0.5)), 400).warnings()).extracting("severity").containsExactly("ERROR");
    }

    @Test
    void vectorArtworkNeverTriggersResolutionWarnings() {
        var r = DesignChecker.check(doc(image(300, 400, 0.5)), AREAS, id -> new DesignChecker.ArtworkPixels(10, 10, true));
        assertThat(r.warnings()).isEmpty();
    }

    @Test
    void flagsSafeMarginAndPrintAreaOverflow() {
        String nearEdge = "{\"type\":\"rect\",\"left\":10,\"top\":400,\"width\":10,\"height\":10}";
        String overflowing = "{\"type\":\"rect\",\"left\":590,\"top\":400,\"width\":40,\"height\":10}";
        // 700 units long would overflow the 600-unit width, but rotated 45 degrees its bounding box is ~509 units.
        String longBar = "{\"type\":\"rect\",\"left\":300,\"top\":400,\"width\":700,\"height\":20";
        assertThat(check(doc(nearEdge), 1).warnings()).extracting("code").containsExactly("OUTSIDE_SAFE_AREA");
        assertThat(check(doc(overflowing), 1).warnings()).extracting("code").containsExactly("OUTSIDE_PRINT_AREA");
        assertThat(check(doc(longBar + "}"), 1).warnings()).extracting("code").containsExactly("OUTSIDE_PRINT_AREA");
        assertThat(check(doc(longBar + ",\"angle\":45}"), 1).warnings()).isEmpty();
    }

    @Test
    void rejectsUnknownZonesForeignImagesAndBadDocuments() {
        assertThatThrownBy(() -> check(JSON.readTree("{\"version\":1,\"zones\":{\"SLEEVE\":{\"canvasWidth\":1,\"canvasHeight\":1,\"objects\":[]}}}"), 1))
                .isInstanceOf(BusinessRuleException.class);
        String hotlink = "{\"type\":\"image\",\"artworkId\":\"" + ART + "\",\"src\":\"https://evil.example/x.png\",\"width\":10,\"height\":10}";
        assertThatThrownBy(() -> check(doc(hotlink), 1)).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> check(JSON.readTree("{\"version\":2}"), 1)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void emptyDesignIsReported() {
        assertThat(check(doc(""), 1).warnings()).extracting("code").containsExactly("EMPTY_DESIGN");
    }
}
