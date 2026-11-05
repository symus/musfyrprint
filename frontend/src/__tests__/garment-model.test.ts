import { describe, expect, it } from "vitest";

import { frameFor, garmentDimensions, placementFor, surfaceZ, toPlane } from "@/components/preview3d/garmentModel";

describe("3D garment model", () => {
  it("uses size-chart garment measurements when available", () => {
    expect(garmentDimensions("TSHIRT", { garmentWidth: 58, garmentLength: 76 })).toEqual({ width: 0.58, length: 0.76 });
    expect(garmentDimensions("BODYSUIT", null)).toEqual({ width: 0.23, length: 0.38 });
  });

  it("maps the silhouette so the torso matches the garment width", () => {
    const f = frameFor("TSHIRT", { width: 0.52, length: 0.72 });
    expect(toPlane(f, 162, 24).x - toPlane(f, 78, 24).x).toBeCloseTo(0.52);
    expect(toPlane(f, 120, 210).y).toBeCloseTo(-0.72);
  });

  it("curves the body: deepest at the centre, flat at the sides", () => {
    const f = frameFor("TSHIRT", { width: 0.52, length: 0.72 });
    expect(surfaceZ(f, 0)).toBeCloseTo(0.156);
    expect(surfaceZ(f, 0.26)).toBeLessThan(0.05);
    expect(surfaceZ(f, 0.4)).toBeCloseTo(0.004);
  });

  it("places print areas at real size and shrinks them to fit small garments", () => {
    const adult = frameFor("TSHIRT", { width: 0.52, length: 0.72 });
    const front = placementFor("TSHIRT", { code: "FRONT", widthMm: 300, heightMm: 400 }, adult);
    expect(front).toMatchObject({ side: "front", centerX: 0, width: 0.3, height: 0.4 });
    expect(placementFor("TSHIRT", { code: "BACK", widthMm: 300, heightMm: 400 }, adult).side).toBe("back");
    expect(placementFor("TSHIRT", { code: "LEFT_CHEST", widthMm: 100, heightMm: 100 }, adult).centerX).toBeGreaterThan(0);

    const baby = frameFor("BODYSUIT", { width: 0.22, length: 0.37 });
    const p = placementFor("BODYSUIT", { code: "FRONT", widthMm: 300, heightMm: 400 }, baby);
    expect(p.width).toBeLessThanOrEqual(0.22 * 0.86 + 1e-9);
    expect(p.width / p.height).toBeCloseTo(0.75);
  });
});
