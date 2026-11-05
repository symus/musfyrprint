"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle, CheckCircle2, ShoppingBag, Download, Loader2, Minus, Plus, Redo2, Save, Shapes, Type, Undo2, Upload,
} from "lucide-react";

import { apiFetch, postJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ProductDetail } from "@/lib/api/types";
import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { sizeLabel } from "@/lib/format/labels";
import { checkDesign, printPixelWidth } from "./checks";
import { Editor } from "./Editor";
import { LayersPanel, PropertiesPanel, TemplatesPanel, type TemplateSummary } from "./Panels";
import type { ShapeKind } from "./shapes";
import { findDraft, rememberDraft } from "./storage";
import { addToCart } from "@/components/commerce/cart-client";
import type { DesignDocument, PrintWarning, Zone } from "./types";

// three.js is large: load the 3D preview only when it is opened.
const Preview3DPanel = dynamic(() => import("@/components/preview3d/Preview3DPanel"), { ssr: false });

type Tab = "add" | "templates" | "layers" | "edit";

interface SavedState {
  id: string;
  token: string;
  version: number;
}

export function DesignStudio({ product, initialColor, initialSize, designId }: {
  product: ProductDetail;
  initialColor: string | null;
  initialSize: string | null;
  designId: string | null;
}) {
  const { t, locale, href } = useI18n();
  const s = t.studio;
  const zones: Zone[] = useMemo(() => product.printAreas.map((a) => ({
    code: a.code, name: a.name, widthMm: a.widthMm, heightMm: a.heightMm, safeMarginMm: a.safeMarginMm, minDpi: a.minDpi,
  })), [product.printAreas]);
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [tab, setTab] = useState<Tab>("add");
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState(initialColor ?? product.colors[0]?.code ?? null);
  const [size, setSize] = useState(initialSize);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [warnings, setWarnings] = useState<PrintWarning[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [rights, setRights] = useState(false);
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [show3d, setShow3d] = useState(false);
  const colorHex = product.colors.find((c) => c.code === color)?.hex ?? "#FFFFFF";

  // Create the editor (and load a saved draft if one was requested and this device holds its token).
  useEffect(() => {
    if (!canvasEl.current || zones.length === 0) return;
    let disposed = false;
    let instance: Editor | null = null;
    (async () => {
      let initial: DesignDocument | null = null;
      const draft = designId ? findDraft(designId) : null;
      if (draft) {
        try {
          const d = await apiFetch<{ document: DesignDocument; version: number; colorCode: string | null; sizeCode: string | null }>(
            `/api/v1/designs/${draft.id}`, { headers: { "X-Design-Token": draft.token } });
          initial = d.document;
          setSaved({ id: draft.id, token: draft.token, version: d.version });
          if (d.colorCode) setColor(d.colorCode);
          if (d.sizeCode) setSize(d.sizeCode);
        } catch {
          // draft no longer available – start fresh
        }
      }
      if (disposed || !canvasEl.current) return;
      instance = new Editor(canvasEl.current, zones, colorHex, initial);
      await instance.init();
      if (disposed) return instance.dispose();
      setEditor(instance);
    })();
    return () => {
      disposed = true;
      instance?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the editor is created once per product/draft
  }, [zones, designId]);

  useEffect(() => editor?.subscribe(rerender), [editor]);
  useEffect(() => editor?.setGarmentColor(colorHex), [editor, colorHex]);

  // Fit the canvas to the available width (times the user's zoom).
  useEffect(() => {
    if (!editor || !stage.current) return;
    const el = stage.current;
    const resize = () => {
      const available = el.clientWidth - 32;
      const byHeight = (window.innerHeight * 0.68) / editor.height;
      editor.fit(Math.max(0.3, Math.min(available / 600, byHeight)) * zoom);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [editor, zoom, editor?.activeZone]);

  // Live print checks (debounced).
  useEffect(() => {
    if (!editor) return;
    const id = setTimeout(() => setWarnings(checkDesign(editor.document(), zones)), 250);
    return () => clearTimeout(id);
  });

  useEffect(() => {
    fetch(`/api/v1/design-templates?family=${product.productFamily}`, { headers: { "Accept-Language": locale } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => undefined);
  }, [product.productFamily, locale]);

  // Keyboard shortcuts (ignored while typing in inputs or editing text on the canvas).
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((editor.selection as { isEditing?: boolean } | null)?.isEditing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); void (e.shiftKey ? editor.redo() : editor.undo()); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); void editor.redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && editor.selection) { e.preventDefault(); editor.removeSelection(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const onUpload = useCallback(async (file: File) => {
    if (!editor) return;
    if (!rights) { setUpload({ busy: false, error: s.rightsNeeded }); return; }
    setUpload({ busy: true, error: null });
    const form = new FormData();
    form.append("file", file);
    form.append("rightsConfirmed", "true");
    try {
      const art = await apiFetch<{ id: string; url: string; widthPx: number | null; heightPx: number | null; mimeType: string }>(
        "/api/v1/artworks", { method: "POST", body: form });
      await editor.addArtwork(art);
      setUpload({ busy: false, error: null });
      setTab("edit");
    } catch (err) {
      const code = err instanceof ApiError ? String((err.problem as { code?: string }).code ?? "") : "";
      setUpload({ busy: false, error: s.uploadErrors[code] ?? s.uploadErrors.DEFAULT });
    }
  }, [editor, rights, s]);

  const save = useCallback(async (asCopy = false): Promise<SavedState | null> => {
    if (!editor) return null;
    setSaveState("saving");
    const body = { productSlug: product.slug, colorCode: color, sizeCode: size, name: product.name, document: editor.document() };
    try {
      if (saved && !asCopy) {
        const d = await apiFetch<{ version: number }>(`/api/v1/designs/${saved.id}`, {
          method: "PUT",
          headers: { "X-Design-Token": saved.token },
          body: JSON.stringify({ ...body, version: saved.version }),
        });
        const next = { ...saved, version: d.version };
        setSaved(next);
        setSaveState("saved");
        return next;
      } else {
        const created = await postJson<{ design: { id: string; version: number }; editToken: string }>("/api/v1/designs", body);
        const next = { id: created.design.id, token: created.editToken, version: created.design.version };
        setSaved(next);
        rememberDraft({ id: next.id, token: next.token, productSlug: product.slug, name: product.name, savedAt: new Date().toISOString() });
        window.history.replaceState(null, "", href(`/design/${product.slug}?design=${next.id}`));
        setSaveState("saved");
        return next;
      }
    } catch (err) {
      setSaveState(err instanceof ApiError && err.status === 409 ? "conflict" : "error");
      return null;
    }
  }, [editor, product, color, size, saved, href]);

  // Add to cart = save the latest version, then add it with its edit token (the server re-checks print quality).
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState<{ kind: "idle" | "busy" | "done" | "error"; message?: string }>({ kind: "idle" });
  const addDesignToCart = useCallback(async () => {
    const sizeCode = size ?? (product.sizes.length === 1 ? product.sizes[0].code : null);
    if (!sizeCode) {
      setCartState({ kind: "error", message: t.cart.chooseSize });
      return;
    }
    setCartState({ kind: "busy" });
    const current = await save(false);
    if (!current) {
      setCartState({ kind: "error", message: s.saveError });
      return;
    }
    try {
      await addToCart({ productSlug: product.slug, colorCode: color, sizeCode, quantity, designId: current.id, designToken: current.token });
      setCartState({ kind: "done" });
    } catch (e) {
      setCartState({ kind: "error", message: e instanceof ApiError ? (e.problem.detail ?? t.checkout.errorGeneric) : t.checkout.errorGeneric });
    }
  }, [size, product, save, color, quantity, t, s]);

  const exportZones = useCallback(async () => {
    if (!editor) return;
    const doc = editor.document();
    for (const code of Object.keys(doc.zones)) {
      const zone = zones.find((z) => z.code === code);
      if (!zone) continue;
      const canvas = await editor.renderZone(code, printPixelWidth(zone));
      const a = document.createElement("a");
      a.download = `${product.slug}-${code.toLowerCase()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    }
  }, [editor, zones, product.slug]);

  if (!product.customizable || zones.length === 0) {
    return <p className="card p-8">{s.notCustomisable}</p>;
  }

  const zoneName = (code: string | null) => zones.find((z) => z.code === code)?.name ?? "";
  const warningText = (w: PrintWarning) => {
    const zone = zones.find((z) => z.code === w.zone);
    const key = w.code === "LOW_RESOLUTION" && w.severity === "ERROR" ? "LOW_RESOLUTION_ERROR" : w.code;
    return fmt(s.warn[key], { zone: zoneName(w.zone), dpi: w.value ?? "", min: zone?.minDpi ?? "" });
  };
  const tool = "flex flex-col items-center gap-1 rounded-xl border border-line bg-white p-3 text-xs font-semibold hover:border-ink disabled:opacity-50";
  const iconBtn = "inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white hover:border-ink disabled:opacity-40";

  const addPanel = editor && (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={tool} onClick={() => { void editor.addText(s.newText); setTab("edit"); }}>
          <Type size={20} aria-hidden="true" />{s.addText}
        </button>
        {(["rect", "circle", "star", "heart", "triangle"] as ShapeKind[]).map((k) => (
          <button key={k} type="button" className={tool} onClick={() => { editor.addShape(k); setTab("edit"); }}>
            <Shapes size={20} aria-hidden="true" />{s.shapes[k]}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-ink/40 p-3">
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5 size-4 accent-violet" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          <span>{s.rights} <Link href="/help/content-policy" className="underline">↗</Link></span>
        </label>
        <label className={`btn btn-secondary mt-3 w-full !py-2 ${rights ? "" : "opacity-60"}`}>
          {upload.busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
          {upload.busy ? s.uploading : s.upload}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" disabled={upload.busy}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onUpload(f); }} />
        </label>
        <p className="mt-2 text-xs text-ink-soft">{s.uploadHint}</p>
        {upload.error && <p role="alert" className="mt-2 text-sm text-danger">{upload.error}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/products/${product.slug}`} className="text-sm text-violet hover:underline">← {s.back}</Link>
        <h1 className="mr-auto text-2xl font-extrabold">{product.name}</h1>
        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} aria-label={s.undo} title={s.undo} disabled={!editor?.canUndo()} onClick={() => editor?.undo()}><Undo2 size={16} aria-hidden="true" /></button>
          <button type="button" className={iconBtn} aria-label={s.redo} title={s.redo} disabled={!editor?.canRedo()} onClick={() => editor?.redo()}><Redo2 size={16} aria-hidden="true" /></button>
          <button type="button" className={iconBtn} aria-label={s.zoomOut} title={s.zoomOut} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><Minus size={16} aria-hidden="true" /></button>
          <button type="button" className="h-9 rounded-lg border border-line bg-white px-2 text-xs font-semibold tabular-nums hover:border-ink" aria-label={s.zoomReset} onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button type="button" className={iconBtn} aria-label={s.zoomIn} title={s.zoomIn} onClick={() => setZoom((z) => Math.min(3, z + 0.25))}><Plus size={16} aria-hidden="true" /></button>
        </div>
        <button type="button" className="btn btn-primary !py-2" disabled={!editor || saveState === "saving"} onClick={() => save(false)}>
          {saveState === "saving" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {saveState === "saving" ? s.saving : saveState === "saved" ? s.saved : s.save}
        </button>
        {saved && <button type="button" className="btn btn-secondary !py-2" onClick={() => save(true)}>{s.saveCopy}</button>}
      </div>
      <div aria-live="polite" className="text-sm">
        {saveState === "error" && <p role="alert" className="text-danger">{s.saveError}</p>}
        {saveState === "conflict" && <p role="alert" className="text-danger">{s.conflict}</p>}
      </div>

      {/* Print areas */}
      <div role="tablist" aria-label={s.zones} className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <button key={z.code} role="tab" type="button" aria-selected={editor?.activeZone === z.code}
            onClick={() => editor?.switchZone(z.code)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${editor?.activeZone === z.code ? "bg-ink text-paper" : "bg-white ring-1 ring-line hover:ring-ink"}`}>
            {z.name}
            {editor && editor.objectCount(z.code) > 0 && <span className="ml-2 rounded-full bg-sun px-1.5 text-xs text-ink">{editor.objectCount(z.code)}</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[17rem_1fr_19rem]">
        {/* Left: add / templates / layers (desktop); tabbed on mobile */}
        <aside className="order-2 lg:order-1">
          <div role="tablist" className="mb-3 flex gap-1 lg:hidden">
            {(["add", "templates", "layers", "edit"] as Tab[]).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${tab === k ? "bg-ink text-paper" : "bg-white ring-1 ring-line"}`}>
                {k === "add" ? s.add : k === "templates" ? s.templates : k === "layers" ? s.layers : s.properties}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <section className={`card p-4 ${tab === "add" ? "" : "hidden lg:block"}`}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{s.add}</h2>
              {addPanel}
            </section>
            <section className={`card p-4 ${tab === "templates" ? "" : "hidden lg:block"}`}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{s.templates}</h2>
              <TemplatesPanel templates={templates} onApply={(tpl) => {
                if (editor && (editor.canvas.getObjects().length === 0 || window.confirm(s.applyTemplateConfirm))) void editor.applyTemplate(tpl.document.objects);
              }} />
            </section>
            <section className={`card p-4 ${tab === "layers" ? "" : "hidden lg:block"}`}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{s.layers}</h2>
              {editor && <LayersPanel editor={editor} />}
            </section>
          </div>
        </aside>

        {/* Centre: canvas */}
        <div ref={stage} className="order-1 overflow-auto rounded-[var(--radius-card)] bg-cloud p-4 lg:order-2" style={{ maxHeight: "78vh" }}>
          {!editor && <p className="flex items-center gap-2 p-8 text-ink-soft" aria-busy="true"><Loader2 className="animate-spin" size={18} aria-hidden="true" />{s.loading}</p>}
          <div className="mx-auto w-fit shadow-[var(--shadow-card)]">
            <canvas ref={canvasEl} aria-label={`${s.title}: ${editor ? zoneName(editor.activeZone) : ""}`} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">{s.keyboard}</p>
        </div>

        {/* Right: product options, properties, checks */}
        <aside className="order-3 space-y-4">
          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">{s.garmentColour}</h2>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button key={c.code} type="button" aria-label={c.name} title={c.name} aria-pressed={c.code === color} onClick={() => setColor(c.code)}
                  className={`size-8 rounded-full border-2 ${c.code === color ? "border-ink ring-2 ring-violet ring-offset-1" : "border-line"}`} style={{ background: c.hex }} />
              ))}
            </div>
            {product.sizes.length > 1 && (
              <label className="block text-sm">
                <span className="label">{s.size}</span>
                <select className="input !py-2" value={size ?? ""} onChange={(e) => setSize(e.target.value || null)}>
                  <option value="">–</option>
                  {product.sizes.map((x) => <option key={x.code} value={x.code} disabled={!x.available}>{sizeLabel(t, x.code)}</option>)}
                </select>
              </label>
            )}
          </section>
          <section className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">{s.preview3d}</h2>
              <button type="button" className="text-sm font-semibold text-violet underline" aria-expanded={show3d} onClick={() => setShow3d((v) => !v)}>
                {show3d ? s.hide3d : s.show3d}
              </button>
            </div>
            {show3d && editor && (
              <div className="mt-3">
                <Preview3DPanel editor={editor} garmentType={product.garmentType} colorHex={colorHex} slug={product.slug} sizeCode={size} />
              </div>
            )}
          </section>
          <section className={`card p-4 ${tab === "edit" ? "" : "hidden lg:block"}`}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{s.properties}</h2>
            {editor && <PropertiesPanel editor={editor} />}
          </section>
          <section className="card p-4" aria-live="polite">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">{s.checks}</h2>
            {warnings.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 size={16} aria-hidden="true" />{s.checksOk}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {warnings.map((w, i) => (
                  <li key={i} className={`flex gap-2 ${w.severity === "ERROR" ? "text-danger" : "text-coral-strong"}`}>
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{warningText(w)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card space-y-3 p-4">
            <label className="flex items-center justify-between gap-2 text-sm font-semibold">
              {t.cart.quantity}
              <input type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="input !w-24 !py-2" />
            </label>
            <button type="button" className="btn btn-violet w-full !py-2"
              disabled={!editor || cartState.kind === "busy" || warnings.some((w) => w.severity === "ERROR")} onClick={addDesignToCart}>
              {cartState.kind === "busy" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}
              {cartState.kind === "busy" ? t.cart.adding : t.cart.add}
            </button>
            <div aria-live="polite" className="text-sm">
              {cartState.kind === "done" && <p className="font-semibold text-success">{t.cart.added} · <Link href="/cart" className="underline">{t.cart.open}</Link></p>}
              {cartState.kind === "error" && <p role="alert" className="text-danger">{cartState.message}</p>}
            </div>
          </section>
          <section className="card space-y-2 p-4">
            <button type="button" className="btn btn-secondary w-full !py-2" disabled={!editor || warnings.some((w) => w.code === "EMPTY_DESIGN")} onClick={exportZones}>
              <Download size={18} aria-hidden="true" />{s.exportPng}
            </button>
            <p className="text-xs text-ink-soft">{s.exportNote}</p>
            <p className="text-xs text-ink-soft">{s.savedNote}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
