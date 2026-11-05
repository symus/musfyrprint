/** A print area of the product, in millimetres (from the catalogue's print_areas). */
export interface Zone {
  code: string;
  name: string;
  widthMm: number;
  heightMm: number;
  safeMarginMm: number;
  minDpi: number;
}

/** Serialised objects for one print area. Coordinates are canvas units; canvasWidth maps to zone.widthMm. */
export interface ZoneDoc {
  canvasWidth: number;
  canvasHeight: number;
  objects: SerializedObject[];
}

export interface DesignDocument {
  version: 1;
  zones: Record<string, ZoneDoc>;
}

export interface SerializedObject {
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  originX?: string;
  originY?: string;
  artworkId?: string;
  artworkWidthPx?: number;
  artworkVector?: boolean;
  [key: string]: unknown;
}

export interface PrintWarning {
  zone: string | null;
  code: "LOW_RESOLUTION" | "OUTSIDE_SAFE_AREA" | "OUTSIDE_PRINT_AREA" | "EMPTY_DESIGN";
  severity: "WARNING" | "ERROR";
  objectIndex: number | null;
  value: number | null;
}

/** Logical canvas width for every print area; height follows the area's aspect ratio. */
export const CANVAS_WIDTH = 600;
export const canvasHeightFor = (zone: Zone) => Math.round((CANVAS_WIDTH * zone.heightMm) / zone.widthMm);
