import type { DesignDocument, PrintWarning, SerializedObject, Zone } from "./types";

/**
 * Client-side print checks. Mirrors the backend's DesignChecker so customers see problems while designing;
 * the server repeats the checks authoritatively when the design is saved.
 */
export function boundingBox(o: SerializedObject) {
  const w = (o.width ?? 0) * Math.abs(o.scaleX ?? 1);
  const h = (o.height ?? 0) * Math.abs(o.scaleY ?? 1);
  const rad = ((o.angle ?? 0) * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const bh = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  let cx = o.left ?? 0;
  let cy = o.top ?? 0;
  if (o.originX === "left") cx += w / 2;
  if (o.originY === "top") cy += h / 2;
  return { left: cx - bw / 2, top: cy - bh / 2, right: cx + bw / 2, bottom: cy + bh / 2 };
}

/** Effective print resolution of a raster image at its current size, or null for vectors / unknown sizes. */
export function effectiveDpi(o: SerializedObject, zone: Zone, canvasWidth: number): number | null {
  if (o.type?.toLowerCase() !== "image" || o.artworkVector || !o.artworkWidthPx) return null;
  const mmPerUnit = zone.widthMm / canvasWidth;
  const shownMm = (o.width ?? o.artworkWidthPx) * Math.abs(o.scaleX ?? 1) * mmPerUnit;
  return Math.round(o.artworkWidthPx / (shownMm / 25.4));
}

export function checkDesign(doc: DesignDocument, zones: Zone[]): PrintWarning[] {
  const warnings: PrintWarning[] = [];
  let total = 0;
  for (const [code, z] of Object.entries(doc.zones)) {
    const zone = zones.find((x) => x.code === code);
    if (!zone) continue;
    const mmPerUnit = zone.widthMm / z.canvasWidth;
    const safe = zone.safeMarginMm / mmPerUnit;
    z.objects.forEach((o, i) => {
      total++;
      const b = boundingBox(o);
      if (b.left < -0.5 || b.top < -0.5 || b.right > z.canvasWidth + 0.5 || b.bottom > z.canvasHeight + 0.5) {
        warnings.push({ zone: code, code: "OUTSIDE_PRINT_AREA", severity: "ERROR", objectIndex: i, value: null });
      } else if (b.left < safe || b.top < safe || b.right > z.canvasWidth - safe || b.bottom > z.canvasHeight - safe) {
        warnings.push({ zone: code, code: "OUTSIDE_SAFE_AREA", severity: "WARNING", objectIndex: i, value: null });
      }
      const dpi = effectiveDpi(o, zone, z.canvasWidth);
      if (dpi !== null && dpi < zone.minDpi) {
        warnings.push({ zone: code, code: "LOW_RESOLUTION", severity: dpi < zone.minDpi / 2 ? "ERROR" : "WARNING", objectIndex: i, value: dpi });
      }
    });
  }
  if (total === 0) warnings.push({ zone: null, code: "EMPTY_DESIGN", severity: "WARNING", objectIndex: null, value: null });
  return warnings;
}

/** Pixel width needed to print a zone at its minimum DPI (used for exports). */
export const printPixelWidth = (zone: Zone) => Math.round((zone.widthMm / 25.4) * zone.minDpi);
