package com.musfyr.print.design;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import tools.jackson.databind.JsonNode;

import com.musfyr.print.common.error.BusinessRuleException;

/**
 * Validates the structure of a saved design and computes print-readiness warnings per print area.
 *
 * <p>Document format (written by the studio):
 * <pre>{"version":1,"zones":{"FRONT":{"canvasWidth":600,"canvasHeight":800,"objects":[...]}}}</pre>
 * Objects use Fabric.js JSON with centre origin; images carry {@code artworkId}. Canvas units map linearly onto the
 * print area: {@code mmPerUnit = area.widthMm / canvasWidth}.
 */
public final class DesignChecker {

    static final int MAX_OBJECTS_PER_ZONE = 200;
    private static final Pattern ARTWORK_SRC = Pattern.compile("(?:^|/)api/v1/artworks/([0-9a-f-]{36})/content$");

    private DesignChecker() {
    }

    public record AreaSpec(int widthMm, int heightMm, int safeMarginMm, int minDpi) {
    }

    public record ArtworkPixels(Integer widthPx, Integer heightPx, boolean vector) {
    }

    /** severity: ERROR blocks ordering later; WARNING is advisory. */
    public record Warning(String zone, String code, String severity, Integer objectIndex, Integer value) {
    }

    public record Result(List<Warning> warnings, Set<UUID> artworkIds) {
    }

    public static Result check(JsonNode doc, Map<String, AreaSpec> areas, Function<UUID, ArtworkPixels> artworks) {
        if (doc == null || !doc.isObject() || doc.path("version").asInt(0) != 1 || !doc.path("zones").isObject()) {
            throw new BusinessRuleException("Unsupported design document");
        }
        List<Warning> warnings = new ArrayList<>();
        Set<UUID> artworkIds = new LinkedHashSet<>();
        int totalObjects = 0;
        for (Map.Entry<String, JsonNode> zoneEntry : doc.path("zones").properties()) {
            String zone = zoneEntry.getKey();
            AreaSpec area = areas.get(zone);
            if (area == null) {
                throw new BusinessRuleException("This product has no print area " + zone);
            }
            JsonNode z = zoneEntry.getValue();
            double canvasW = z.path("canvasWidth").asDouble(0);
            double canvasH = z.path("canvasHeight").asDouble(0);
            JsonNode objects = z.path("objects");
            if (canvasW <= 0 || canvasH <= 0 || !objects.isArray()) {
                throw new BusinessRuleException("Invalid print area " + zone);
            }
            if (objects.size() > MAX_OBJECTS_PER_ZONE) {
                throw new BusinessRuleException("Too many elements in " + zone);
            }
            totalObjects += objects.size();
            double mmPerUnit = area.widthMm() / canvasW;
            double safe = area.safeMarginMm() / mmPerUnit;
            for (int i = 0; i < objects.size(); i++) {
                JsonNode o = objects.get(i);
                Box b = box(o);
                if (b.left < -0.5 || b.top < -0.5 || b.right > canvasW + 0.5 || b.bottom > canvasH + 0.5) {
                    warnings.add(new Warning(zone, "OUTSIDE_PRINT_AREA", "ERROR", i, null));
                } else if (b.left < safe || b.top < safe || b.right > canvasW - safe || b.bottom > canvasH - safe) {
                    warnings.add(new Warning(zone, "OUTSIDE_SAFE_AREA", "WARNING", i, null));
                }
                if ("image".equalsIgnoreCase(o.path("type").asString(""))) {
                    UUID id = artworkId(o);
                    artworkIds.add(id);
                    ArtworkPixels px = artworks.apply(id);
                    if (!px.vector() && px.widthPx() != null) {
                        double shownMm = o.path("width").asDouble(px.widthPx()) * Math.abs(o.path("scaleX").asDouble(1)) * mmPerUnit;
                        // Effective resolution of the image at its printed size.
                        int dpi = (int) Math.round(px.widthPx() / (shownMm / 25.4));
                        if (dpi < area.minDpi() / 2) {
                            warnings.add(new Warning(zone, "LOW_RESOLUTION", "ERROR", i, dpi));
                        } else if (dpi < area.minDpi()) {
                            warnings.add(new Warning(zone, "LOW_RESOLUTION", "WARNING", i, dpi));
                        }
                    }
                }
            }
        }
        if (totalObjects == 0) {
            warnings.add(new Warning(null, "EMPTY_DESIGN", "WARNING", null, null));
        }
        return new Result(List.copyOf(warnings), artworkIds);
    }

    private static UUID artworkId(JsonNode o) {
        String id = o.path("artworkId").asString("");
        Matcher m = ARTWORK_SRC.matcher(o.path("src").asString(""));
        if (id.isEmpty() || !m.find() || !m.group(1).equalsIgnoreCase(id)) {
            throw new BusinessRuleException("Images must be uploaded artwork");
        }
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Images must be uploaded artwork");
        }
    }

    private record Box(double left, double top, double right, double bottom) {
    }

    /** Axis-aligned bounding box of a (possibly rotated) centre-origin object, in canvas units. */
    static Box box(JsonNode o) {
        double w = o.path("width").asDouble(0) * Math.abs(o.path("scaleX").asDouble(1));
        double h = o.path("height").asDouble(0) * Math.abs(o.path("scaleY").asDouble(1));
        double rad = Math.toRadians(o.path("angle").asDouble(0));
        double bw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
        double bh = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
        double cx = o.path("left").asDouble(0);
        double cy = o.path("top").asDouble(0);
        if ("left".equals(o.path("originX").asString("center"))) {
            cx += w / 2;
        }
        if ("top".equals(o.path("originY").asString("center"))) {
            cy += h / 2;
        }
        return new Box(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2);
    }
}
