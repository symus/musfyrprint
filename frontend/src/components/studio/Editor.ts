import { Canvas, FabricImage, FabricObject, Point, StaticCanvas } from "fabric";

import { createShape, createText, fromTemplate, type ShapeKind, type TemplateObject } from "./shapes";
import { CANVAS_WIDTH, canvasHeightFor, type DesignDocument, type SerializedObject, type Zone, type ZoneDoc } from "./types";

// Saved with every object so the design can be re-validated and printed later.
FabricObject.customProperties = ["artworkId", "artworkWidthPx", "artworkVector", "layerName"];

const SNAP_UNITS = 6;
const HISTORY_LIMIT = 60;

type Listener = () => void;

/**
 * Wraps one Fabric canvas that edits one print area at a time. All coordinates are logical canvas units
 * (CANVAS_WIDTH wide); the on-screen size is a separate display zoom so saved designs never depend on screen size.
 */
export class Editor {
  readonly canvas: Canvas;
  readonly zones: Zone[];
  activeZone: string;
  private docs: Record<string, ZoneDoc> = {};
  private history: Record<string, { stack: string[]; index: number }> = {};
  private listeners = new Set<Listener>();
  private suppress = 0;
  private garmentHex: string;
  private guides = { x: false, y: false };
  private displayScale = 1;

  constructor(element: HTMLCanvasElement, zones: Zone[], garmentHex: string, initial?: DesignDocument | null) {
    this.zones = zones;
    this.activeZone = zones[0].code;
    this.garmentHex = garmentHex;
    for (const z of zones) {
      const saved = initial?.zones?.[z.code];
      this.docs[z.code] = saved ?? { canvasWidth: CANVAS_WIDTH, canvasHeight: canvasHeightFor(z), objects: [] };
      this.history[z.code] = { stack: [JSON.stringify(this.docs[z.code].objects)], index: 0 };
    }
    this.canvas = new Canvas(element, { preserveObjectStacking: true, backgroundColor: garmentHex, selectionColor: "rgba(106,77,244,0.12)" });
    this.wireEvents();
  }

  // ------------------------------------------------------------------------------------------------ lifecycle

  async init() {
    await this.load(this.activeZone);
  }

  dispose() {
    this.listeners.clear();
    void this.canvas.dispose();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  get zone(): Zone {
    return this.zones.find((z) => z.code === this.activeZone) ?? this.zones[0];
  }

  get height() {
    return canvasHeightFor(this.zone);
  }

  // ----------------------------------------------------------------------------------------------- zones & io

  async switchZone(code: string) {
    if (code === this.activeZone) return;
    this.capture();
    this.activeZone = code;
    await this.load(code);
  }

  private async load(code: string) {
    this.suppress++;
    try {
      this.canvas.discardActiveObject();
      await this.canvas.loadFromJSON({ objects: this.docs[code].objects, background: this.garmentHex });
      this.canvas.backgroundColor = this.garmentHex;
      this.fit(this.displayScale);
    } finally {
      this.suppress--;
    }
    this.canvas.requestRenderAll();
    this.emit();
  }

  /** Copies the live canvas into the in-memory document for the active zone. */
  private capture() {
    const json = this.canvas.toObject(FabricObject.customProperties) as { objects: SerializedObject[] };
    this.docs[this.activeZone] = { canvasWidth: CANVAS_WIDTH, canvasHeight: this.height, objects: json.objects };
  }

  /** The design as saved to the backend: only print areas that contain something. */
  document(): DesignDocument {
    this.capture();
    const zones: Record<string, ZoneDoc> = {};
    for (const [code, doc] of Object.entries(this.docs)) if (doc.objects.length > 0) zones[code] = doc;
    return { version: 1, zones };
  }

  objectCount(code: string) {
    return code === this.activeZone ? this.canvas.getObjects().length : this.docs[code]?.objects.length ?? 0;
  }

  setGarmentColor(hex: string) {
    this.garmentHex = hex;
    this.canvas.backgroundColor = hex;
    this.canvas.requestRenderAll();
    this.emit();
  }

  /** Scales the on-screen canvas; the logical design size never changes. */
  fit(scale: number) {
    this.displayScale = scale;
    this.canvas.setDimensions({ width: Math.round(CANVAS_WIDTH * scale), height: Math.round(this.height * scale) });
    this.canvas.setZoom(scale);
    this.canvas.requestRenderAll();
  }

  // ------------------------------------------------------------------------------------------------- history

  private record() {
    if (this.suppress) return;
    const h = this.history[this.activeZone];
    const snapshot = JSON.stringify((this.canvas.toObject(FabricObject.customProperties) as { objects: unknown[] }).objects);
    if (h.stack[h.index] === snapshot) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snapshot);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.index = h.stack.length - 1;
    this.emit();
  }

  canUndo() {
    return this.history[this.activeZone].index > 0;
  }

  canRedo() {
    const h = this.history[this.activeZone];
    return h.index < h.stack.length - 1;
  }

  async undo() {
    const h = this.history[this.activeZone];
    if (h.index === 0) return;
    h.index--;
    await this.restore(h.stack[h.index]);
  }

  async redo() {
    const h = this.history[this.activeZone];
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    await this.restore(h.stack[h.index]);
  }

  private async restore(snapshot: string) {
    this.docs[this.activeZone] = { canvasWidth: CANVAS_WIDTH, canvasHeight: this.height, objects: JSON.parse(snapshot) };
    await this.load(this.activeZone);
  }

  // ----------------------------------------------------------------------------------------------- adding

  private add(obj: FabricObject) {
    this.canvas.add(obj);
    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
  }

  async addText(text: string) {
    this.add(await createText(text, CANVAS_WIDTH / 2, this.height / 2, CANVAS_WIDTH * 0.1));
  }

  addShape(kind: ShapeKind, fill = "#FF5A4E") {
    const size = CANVAS_WIDTH * 0.3;
    this.add(createShape(kind, CANVAS_WIDTH / 2, this.height / 2, size, kind === "rect" ? size * 0.6 : size, fill));
  }

  async addArtwork(artwork: { id: string; url: string; widthPx: number | null; heightPx: number | null; mimeType: string }) {
    const img = await FabricImage.fromURL(artwork.url, { crossOrigin: "anonymous" });
    const vector = artwork.mimeType === "image/svg+xml";
    // Fit inside 60% of the print area.
    const scale = Math.min((CANVAS_WIDTH * 0.6) / (img.width || 1), (this.height * 0.6) / (img.height || 1));
    img.set({
      left: CANVAS_WIDTH / 2, top: this.height / 2, originX: "center", originY: "center", scaleX: scale, scaleY: scale,
      artworkId: artwork.id, artworkWidthPx: artwork.widthPx ?? img.width, artworkVector: vector,
    } as Partial<FabricImage>);
    this.add(img);
  }

  /** Replaces the active print area with a template laid out for its size. */
  async applyTemplate(objects: TemplateObject[]) {
    const created = await Promise.all(objects.map((o) => fromTemplate(o, CANVAS_WIDTH, this.height)));
    this.suppress++;
    this.canvas.discardActiveObject();
    this.canvas.remove(...this.canvas.getObjects());
    created.forEach((o) => this.canvas.add(o));
    this.suppress--;
    this.canvas.requestRenderAll();
    this.record();
  }

  // -------------------------------------------------------------------------------------------- selection ops

  get selection(): FabricObject | null {
    return (this.canvas.getActiveObject() as FabricObject | undefined) ?? null;
  }

  select(obj: FabricObject) {
    if (!obj.selectable) return;
    this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
    this.emit();
  }

  /** Applies property changes to the selection and records one undo step. */
  update(props: Record<string, unknown>, target = this.selection) {
    if (!target) return;
    target.set(props);
    target.setCoords();
    this.canvas.requestRenderAll();
    this.record();
    this.emit();
  }

  removeSelection() {
    const active = this.canvas.getActiveObjects();
    if (active.length === 0) return;
    this.canvas.discardActiveObject();
    this.canvas.remove(...active);
    this.canvas.requestRenderAll();
  }

  async duplicateSelection() {
    const s = this.selection;
    if (!s) return;
    const copy = await s.clone(FabricObject.customProperties);
    copy.set({ left: (s.left ?? 0) + 20, top: (s.top ?? 0) + 20 });
    this.add(copy);
  }

  arrange(op: "forward" | "backward" | "front" | "back") {
    const s = this.selection;
    if (!s) return;
    if (op === "forward") this.canvas.bringObjectForward(s);
    if (op === "backward") this.canvas.sendObjectBackwards(s);
    if (op === "front") this.canvas.bringObjectToFront(s);
    if (op === "back") this.canvas.sendObjectToBack(s);
    this.canvas.requestRenderAll();
    this.record();
    this.emit();
  }

  centre(axis: "h" | "v") {
    const s = this.selection;
    if (!s) return;
    const c = s.getCenterPoint();
    s.setPositionByOrigin(new Point(axis === "h" ? CANVAS_WIDTH / 2 : c.x, axis === "v" ? this.height / 2 : c.y), "center", "center");
    s.setCoords();
    this.canvas.requestRenderAll();
    this.record();
    this.emit();
  }

  toggleLock(obj: FabricObject) {
    const locked = !obj.lockMovementX;
    obj.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, hasControls: !locked });
    if (locked) this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.record();
    this.emit();
  }

  toggleVisible(obj: FabricObject) {
    obj.set({ visible: !obj.visible, evented: !obj.visible });
    if (!obj.visible) this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.record();
    this.emit();
  }

  // ------------------------------------------------------------------------------------------------- export

  /** Renders one print area without background or guides, at the given pixel width (for exports and 3D). */
  async renderZone(code: string, pixelWidth: number): Promise<HTMLCanvasElement> {
    if (code === this.activeZone) this.capture();
    const doc = this.docs[code];
    const el = document.createElement("canvas");
    const sc = new StaticCanvas(el, { width: doc.canvasWidth, height: doc.canvasHeight, enableRetinaScaling: false });
    await sc.loadFromJSON({ objects: doc.objects });
    sc.backgroundColor = "";
    sc.renderAll();
    const out = sc.toCanvasElement(pixelWidth / doc.canvasWidth);
    void sc.dispose();
    return out;
  }

  // ------------------------------------------------------------------------------------------------- events

  private wireEvents() {
    const c = this.canvas;
    c.on("object:added", () => { this.record(); this.emit(); });
    c.on("object:removed", () => { this.record(); this.emit(); });
    c.on("object:modified", () => { this.guides = { x: false, y: false }; this.record(); this.emit(); });
    c.on("selection:created", () => this.emit());
    c.on("selection:updated", () => this.emit());
    c.on("selection:cleared", () => this.emit());
    c.on("text:changed", () => this.emit());
    c.on("mouse:up", () => {
      if (this.guides.x || this.guides.y) {
        this.guides = { x: false, y: false };
        c.requestRenderAll();
      }
    });
    // Snap the centre of a moving object to the centre lines of the print area.
    c.on("object:moving", (e) => {
      const o = e.target;
      const centre = o.getCenterPoint();
      const snapX = Math.abs(centre.x - CANVAS_WIDTH / 2) < SNAP_UNITS;
      const snapY = Math.abs(centre.y - this.height / 2) < SNAP_UNITS;
      if (snapX || snapY) {
        o.setPositionByOrigin(new Point(snapX ? CANVAS_WIDTH / 2 : centre.x, snapY ? this.height / 2 : centre.y), "center", "center");
      }
      this.guides = { x: snapX, y: snapY };
    });
    // Print-area border, safe zone and snap guides are drawn on top; they are never part of the design.
    c.on("after:render", ({ ctx }) => {
      if (!ctx) return;
      const z = this.zone;
      const s = this.displayScale;
      const safe = (z.safeMarginMm / z.widthMm) * CANVAS_WIDTH;
      ctx.save();
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.lineWidth = 1.5 / s;
      ctx.setLineDash([6 / s, 4 / s]);
      ctx.strokeStyle = "rgba(196, 48, 30, 0.85)";
      ctx.strokeRect(safe, safe, CANVAS_WIDTH - 2 * safe, this.height - 2 * safe);
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(23, 20, 43, 0.35)";
      ctx.strokeRect(0.5 / s, 0.5 / s, CANVAS_WIDTH - 1 / s, this.height - 1 / s);
      ctx.strokeStyle = "#6A4DF4";
      if (this.guides.x) { ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH / 2, 0); ctx.lineTo(CANVAS_WIDTH / 2, this.height); ctx.stroke(); }
      if (this.guides.y) { ctx.beginPath(); ctx.moveTo(0, this.height / 2); ctx.lineTo(CANVAS_WIDTH, this.height / 2); ctx.stroke(); }
      ctx.restore();
    });
  }
}
