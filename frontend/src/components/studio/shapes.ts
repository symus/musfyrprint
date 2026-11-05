import { Ellipse, FabricObject, IText, Path, Polygon, Rect, Triangle } from "fabric";

import { ensureFont, resolveFont } from "./fonts";

export type ShapeKind = "rect" | "circle" | "triangle" | "star" | "heart";

const HEART = "M 50 90 C 20 70 0 50 0 28 C 0 12 12 0 27 0 C 37 0 45 6 50 14 C 55 6 63 0 73 0 C 88 0 100 12 100 28 C 100 50 80 70 50 90 Z";

function starPoints(spikes = 5, outer = 50, inner = 21) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push({ x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) });
  }
  return pts;
}

/** Creates a shape of the given size (canvas units), centred at (x, y). */
export function createShape(kind: ShapeKind, x: number, y: number, w: number, h: number, fill: string, angle = 0): FabricObject {
  const common = { left: x, top: y, fill, angle, originX: "center" as const, originY: "center" as const };
  switch (kind) {
    case "rect":
      return new Rect({ ...common, width: w, height: h, rx: Math.min(w, h) * 0.04, ry: Math.min(w, h) * 0.04 });
    case "circle":
      return new Ellipse({ ...common, rx: w / 2, ry: h / 2 });
    case "triangle":
      return new Triangle({ ...common, width: w, height: h });
    case "star": {
      const p = new Polygon(starPoints(), { ...common });
      p.set({ scaleX: w / (p.width || 100), scaleY: h / (p.height || 100) });
      return p;
    }
    case "heart": {
      const p = new Path(HEART, { ...common });
      p.set({ scaleX: w / (p.width || 100), scaleY: h / (p.height || 90) });
      return p;
    }
  }
}

export interface TemplateObject {
  type: "text" | "shape";
  x: number;
  y: number;
  // text
  text?: string;
  size?: number;
  font?: string;
  color?: string;
  weight?: number;
  style?: string;
  spacing?: number;
  stroke?: string;
  // shape
  shape?: ShapeKind;
  w?: number;
  h?: number;
  fill?: string;
  angle?: number;
}

export async function createText(text: string, x: number, y: number, fontSize: number, opts: Partial<{
  fontFamily: string; fill: string; fontWeight: number | string; fontStyle: string; charSpacing: number; stroke: string;
}> = {}) {
  const fontFamily = resolveFont(opts.fontFamily ?? "Bricolage Grotesque");
  await ensureFont(fontFamily, opts.fontWeight ?? 400);
  return new IText(text, {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    textAlign: "center",
    fontSize,
    fontFamily,
    fill: opts.fill ?? "#17142B",
    fontWeight: opts.fontWeight ?? 700,
    fontStyle: (opts.fontStyle as "normal" | "italic") ?? "normal",
    charSpacing: opts.charSpacing ?? 0,
    stroke: opts.stroke ?? undefined,
    strokeWidth: opts.stroke ? 2 : 0,
    paintFirst: "stroke",
  });
}

/** Turns a resolution-independent template object into a canvas object for an area of w × h units. */
export async function fromTemplate(o: TemplateObject, w: number, h: number): Promise<FabricObject> {
  if (o.type === "text") {
    return createText(o.text ?? "", o.x * w, o.y * h, (o.size ?? 0.1) * w, {
      fontFamily: o.font, fill: o.color, fontWeight: o.weight, fontStyle: o.style, charSpacing: (o.spacing ?? 0) * 60, stroke: o.stroke,
    });
  }
  return createShape(o.shape ?? "rect", o.x * w, o.y * h, (o.w ?? 0.2) * w, (o.h ?? 0.2) * w, o.fill ?? "#17142B", o.angle ?? 0);
}
