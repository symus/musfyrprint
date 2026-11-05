/**
 * Procedural placeholder garment for the 3D preview, built from the same silhouettes as the 2D illustrations.
 *
 * Coordinates: metres, y up, origin at the centre of the shoulder line; the front faces +z. The torso is curved
 * like an elliptical cylinder so print areas wrap with the body. This is an approximation: real fabric folds,
 * seams and stretch are not simulated. Replace with licensed .glb models via the product's model_key later.
 */

/** Torso box of each silhouette in SVG units (viewBox 240 × 230): left, right, shoulder line, hem. */
export const SILHOUETTE_TORSO: Record<string, { xL: number; xR: number; yShoulder: number; yHem: number }> = {
  TSHIRT: { xL: 78, xR: 162, yShoulder: 24, yHem: 210 },
  LONGSLEEVE: { xL: 78, xR: 162, yShoulder: 24, yHem: 210 },
  TANK: { xL: 74, xR: 166, yShoulder: 22, yHem: 210 },
  HOODIE: { xL: 76, xR: 164, yShoulder: 36, yHem: 212 },
  SWEATSHIRT: { xL: 76, xR: 164, yShoulder: 26, yHem: 212 },
  BODYSUIT: { xL: 84, xR: 156, yShoulder: 26, yHem: 206 },
  TOTE: { xL: 60, xR: 180, yShoulder: 76, yHem: 214 },
};

/** Flat garment width/length in metres when no size chart is available. */
const DEFAULT_DIMENSIONS: Record<string, { width: number; length: number }> = {
  TSHIRT: { width: 0.52, length: 0.72 }, LONGSLEEVE: { width: 0.52, length: 0.72 }, TANK: { width: 0.5, length: 0.7 },
  HOODIE: { width: 0.56, length: 0.7 }, SWEATSHIRT: { width: 0.56, length: 0.7 }, BODYSUIT: { width: 0.23, length: 0.38 },
  TOTE: { width: 0.38, length: 0.42 },
};

export interface GarmentDimensions {
  /** flat chest width in metres */
  width: number;
  /** body length (shoulder to hem) in metres */
  length: number;
}

export function garmentDimensions(garmentType: string, chart?: { garmentWidth: number | null; garmentLength: number | null } | null): GarmentDimensions {
  const fallback = DEFAULT_DIMENSIONS[garmentType] ?? DEFAULT_DIMENSIONS.TSHIRT;
  if (chart?.garmentWidth && chart?.garmentLength) return { width: chart.garmentWidth / 100, length: chart.garmentLength / 100 };
  return fallback;
}

export interface Frame {
  sx: number; // metres per SVG unit (x)
  sy: number; // metres per SVG unit (y)
  torso: (typeof SILHOUETTE_TORSO)[string];
  dims: GarmentDimensions;
  halfWidth: number; // half torso width (m)
  depth: number; // front-to-centre depth of the body (m)
}

export function frameFor(garmentType: string, dims: GarmentDimensions): Frame {
  const torso = SILHOUETTE_TORSO[garmentType] ?? SILHOUETTE_TORSO.TSHIRT;
  const sx = dims.width / (torso.xR - torso.xL);
  const sy = dims.length / (torso.yHem - torso.yShoulder);
  const flat = garmentType === "TOTE";
  return { sx, sy, torso, dims, halfWidth: dims.width / 2, depth: flat ? 0.01 : dims.width * 0.3 };
}

/** SVG point -> garment plane (metres). */
export const toPlane = (f: Frame, u: number, v: number) => ({ x: (u - 120) * f.sx, y: -(v - f.torso.yShoulder) * f.sy });

/** Surface offset in front of the body centre at horizontal position x (elliptical cross-section). */
export function surfaceZ(f: Frame, x: number): number {
  const r = x / (f.halfWidth * 1.04);
  return Math.abs(r) >= 1 ? 0.004 : Math.max(0.004, f.depth * Math.sqrt(1 - r * r));
}

export interface PrintPlacement {
  side: "front" | "back";
  centerX: number; // metres, as seen by a viewer looking at that side
  topY: number; // metres (negative = below shoulder line)
  width: number;
  height: number;
}

/**
 * Where each print area sits on the garment. Sizes are the real print-area dimensions (mm → m), clamped to the
 * garment, so a 30 cm print looks right on an adult tee and fills a baby bodysuit.
 */
export function placementFor(garmentType: string, zone: { code: string; widthMm: number; heightMm: number }, f: Frame): PrintPlacement {
  const L = f.dims.length;
  const W = f.dims.width;
  const front = { HOODIE: 0.3, BODYSUIT: 0.2, TOTE: 0.12 }[garmentType] ?? 0.13;
  const fit = (w: number, h: number, maxW: number) => {
    const k = Math.min(1, maxW / w, (L * 0.8) / h);
    return { width: w * k, height: h * k };
  };
  const real = { w: zone.widthMm / 1000, h: zone.heightMm / 1000 };
  switch (zone.code) {
    case "BACK":
      return { side: "back", centerX: 0, topY: -L * 0.12, ...fit(real.w, real.h, W * 0.86) };
    case "LEFT_CHEST": // wearer's left = viewer's right
      return { side: "front", centerX: W * 0.22, topY: -L * 0.13, ...fit(real.w, real.h, W * 0.3) };
    case "RIGHT_CHEST":
      return { side: "front", centerX: -W * 0.22, topY: -L * 0.13, ...fit(real.w, real.h, W * 0.3) };
    case "LEFT_SLEEVE":
      return { side: "front", centerX: W * 0.5 + 0.07, topY: -L * 0.06, ...fit(real.w, real.h, 0.1) };
    case "RIGHT_SLEEVE":
      return { side: "front", centerX: -W * 0.5 - 0.07, topY: -L * 0.06, ...fit(real.w, real.h, 0.1) };
    default:
      return { side: "front", centerX: 0, topY: -L * front, ...fit(real.w, real.h, W * 0.86) };
  }
}
