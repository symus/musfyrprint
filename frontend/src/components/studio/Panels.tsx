"use client";

import { useState } from "react";
import type { FabricObject, IText } from "fabric";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, Copy, Eye, EyeOff,
  Image as ImageIcon, Lock, MoveHorizontal, MoveVertical, Shapes, Trash2, Type, Unlock,
} from "lucide-react";

import { useI18n } from "@/i18n/client";
import { FONTS, resolveFont } from "./fonts";
import type { Editor } from "./Editor";

const isText = (o: FabricObject | null): o is IText => !!o && ["i-text", "text", "textbox"].includes(o.type.toLowerCase());
const SWATCHES = ["#17142B", "#FFFFFF", "#FF5A4E", "#C4301E", "#FFC23C", "#2EC4A6", "#6A4DF4", "#8FD3FF", "#F8C8D8", "#2F5D46"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm">
      <span className="font-semibold text-ink-soft">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ColourInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button key={c} type="button" aria-label={`${label} ${c}`} title={c} onClick={() => onChange(c)}
          className={`size-6 rounded-full border ${value.toUpperCase() === c ? "ring-2 ring-violet ring-offset-1" : "border-line"}`} style={{ background: c }} />
      ))}
      <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded border border-line bg-white p-0.5" />
    </div>
  );
}

/** Properties of the selected element. */
export function PropertiesPanel({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const s = t.studio;
  const o = editor.selection;
  if (!o) return <p className="text-sm text-ink-soft">{s.noSelection}</p>;
  const text = isText(o) ? o : null;
  const fill = typeof o.fill === "string" ? o.fill : "#17142B";
  const iconBtn = "inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white hover:border-ink";
  const toggleBtn = (on: boolean) =>
    `inline-flex size-9 items-center justify-center rounded-lg border ${on ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"}`;

  return (
    <div className="space-y-3">
      {text && (
        <>
          <Row label={s.font}>
            <select className="input !py-1.5" aria-label={s.font} value={text.fontFamily} onChange={async (e) => {
              const { ensureFont } = await import("./fonts");
              await ensureFont(e.target.value, text.fontWeight as number);
              editor.update({ fontFamily: e.target.value });
            }}>
              {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>)}
            </select>
          </Row>
          <Row label={s.fontSize}>
            <input type="range" min={8} max={240} value={Math.round(text.fontSize)} aria-label={s.fontSize} className="w-full accent-violet"
              onChange={(e) => editor.update({ fontSize: Number(e.target.value) })} />
          </Row>
          <Row label={s.align}>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => {
                const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                return (
                  <button key={a} type="button" aria-label={s.alignOptions[a]} aria-pressed={text.textAlign === a}
                    className={toggleBtn(text.textAlign === a)} onClick={() => editor.update({ textAlign: a })}>
                    <Icon size={16} aria-hidden="true" />
                  </button>
                );
              })}
              <button type="button" aria-pressed={Number(text.fontWeight) >= 700} className={`${toggleBtn(Number(text.fontWeight) >= 700)} font-bold`}
                aria-label={s.bold} onClick={() => editor.update({ fontWeight: Number(text.fontWeight) >= 700 ? 400 : 800 })}>B</button>
              <button type="button" aria-pressed={text.fontStyle === "italic"} className={`${toggleBtn(text.fontStyle === "italic")} italic`}
                aria-label={s.italic} onClick={() => editor.update({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })}>I</button>
            </div>
          </Row>
          <Row label={s.spacing}>
            <input type="range" min={-100} max={800} step={10} value={text.charSpacing ?? 0} aria-label={s.spacing} className="w-full accent-violet"
              onChange={(e) => editor.update({ charSpacing: Number(e.target.value) })} />
          </Row>
          <Row label={s.outline}>
            <div className="flex items-center gap-2">
              <ColourInput label={s.outline} value={typeof text.stroke === "string" ? text.stroke : "#FFFFFF"}
                onChange={(v) => editor.update({ stroke: v, strokeWidth: Math.max(text.strokeWidth || 0, 2), paintFirst: "stroke" })} />
            </div>
          </Row>
          <Row label={s.outlineWidth}>
            <input type="range" min={0} max={12} value={text.strokeWidth ?? 0} aria-label={s.outlineWidth} className="w-full accent-violet"
              onChange={(e) => editor.update({ strokeWidth: Number(e.target.value), paintFirst: "stroke", stroke: text.stroke || "#FFFFFF" })} />
          </Row>
          <Row label={s.shadow}>
            <input type="checkbox" className="size-4 accent-violet" checked={!!text.shadow} aria-label={s.shadow}
              onChange={async (e) => {
                const { Shadow } = await import("fabric");
                editor.update({ shadow: e.target.checked ? new Shadow({ color: "rgba(23,20,43,0.35)", blur: 6, offsetX: 3, offsetY: 3 }) : null });
              }} />
          </Row>
        </>
      )}
      {o.type.toLowerCase() !== "image" && (
        <Row label={s.colour}><ColourInput label={s.colour} value={fill} onChange={(v) => editor.update({ fill: v })} /></Row>
      )}
      <Row label={s.opacity}>
        <input type="range" min={10} max={100} value={Math.round((o.opacity ?? 1) * 100)} aria-label={s.opacity} className="w-full accent-violet"
          onChange={(e) => editor.update({ opacity: Number(e.target.value) / 100 })} />
      </Row>
      <Row label={s.rotation}>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={Math.round(o.angle ?? 0)} aria-label={s.rotation} className="w-full accent-violet"
            onChange={(e) => editor.update({ angle: Number(e.target.value) })} />
          <span className="w-10 text-right text-xs tabular-nums">{Math.round(o.angle ?? 0)}°</span>
        </div>
      </Row>
      <div className="flex flex-wrap gap-1 border-t border-line pt-3">
        <button type="button" className={iconBtn} title={s.centreH} aria-label={s.centreH} onClick={() => editor.centre("h")}><MoveHorizontal size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.centreV} aria-label={s.centreV} onClick={() => editor.centre("v")}><MoveVertical size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.forward} aria-label={s.forward} onClick={() => editor.arrange("forward")}><ChevronUp size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.backward} aria-label={s.backward} onClick={() => editor.arrange("backward")}><ChevronDown size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.front} aria-label={s.front} onClick={() => editor.arrange("front")}><ArrowUpToLine size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.backmost} aria-label={s.backmost} onClick={() => editor.arrange("back")}><ArrowDownToLine size={16} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} title={s.duplicate} aria-label={s.duplicate} onClick={() => editor.duplicateSelection()}><Copy size={16} aria-hidden="true" /></button>
        <button type="button" className={`${iconBtn} text-danger`} title={s.remove} aria-label={s.remove} onClick={() => editor.removeSelection()}><Trash2 size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

/** Layer list, top-most first. */
export function LayersPanel({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const s = t.studio;
  const objects = [...editor.canvas.getObjects()].reverse();
  if (objects.length === 0) return <p className="text-sm text-ink-soft">{s.emptyLayers}</p>;
  const active = editor.selection;
  return (
    <ul className="space-y-1">
      {objects.map((o, i) => {
        const type = o.type.toLowerCase();
        const Icon = type === "image" ? ImageIcon : isText(o) ? Type : Shapes;
        const label = isText(o) ? (o.text || s.layerText).slice(0, 28) : type === "image" ? s.layerImage : s.layerShape;
        const locked = !!o.lockMovementX;
        return (
          <li key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${o === active ? "bg-violet-soft" : "hover:bg-cloud"}`}>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => editor.select(o)} disabled={locked || !o.visible}>
              <Icon size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
              <span className={`truncate ${o.visible ? "" : "text-ink-soft line-through"}`}>{label}</span>
            </button>
            <button type="button" aria-label={o.visible ? s.hide : s.show} title={o.visible ? s.hide : s.show} className="rounded p-1 hover:bg-white" onClick={() => editor.toggleVisible(o)}>
              {o.visible ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
            </button>
            <button type="button" aria-label={locked ? s.unlock : s.lock} title={locked ? s.unlock : s.lock} className="rounded p-1 hover:bg-white" onClick={() => editor.toggleLock(o)}>
              {locked ? <Lock size={15} aria-hidden="true" /> : <Unlock size={15} aria-hidden="true" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface TemplateSummary {
  slug: string;
  category: string;
  name: string;
  family: string;
  document: { version: 1; objects: import("./shapes").TemplateObject[] };
}

export function TemplatesPanel({ templates, onApply }: { templates: TemplateSummary[]; onApply: (t: TemplateSummary) => void }) {
  const { t } = useI18n();
  const s = t.studio;
  const categories = Array.from(new Set(templates.map((x) => x.category)));
  const [category, setCategory] = useState<string | null>(null);
  const shown = templates.filter((x) => !category || x.category === category);
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">{s.templatesIntro}</p>
      <div className="flex flex-wrap gap-1">
        <button type="button" aria-pressed={!category} onClick={() => setCategory(null)}
          className={`chip ${!category ? "bg-ink text-paper" : "bg-white ring-1 ring-line"}`}>✦</button>
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
            className={`chip ${category === c ? "bg-ink text-paper" : "bg-white ring-1 ring-line"}`}>{s.categories[c] ?? c}</button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {shown.map((tpl) => (
          <li key={tpl.slug}>
            <button type="button" onClick={() => onApply(tpl)} className="w-full rounded-xl border border-line bg-white p-2 text-left hover:border-ink">
              <TemplateThumb tpl={tpl} />
              <span className="mt-1 block truncate text-xs font-semibold">{tpl.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lightweight SVG thumbnail of a template (no canvas needed). */
function TemplateThumb({ tpl }: { tpl: TemplateSummary }) {
  return (
    <svg viewBox="0 0 100 120" className="aspect-[5/6] w-full rounded-lg bg-cloud" aria-hidden="true">
      {tpl.document.objects.map((o, i) => {
        const x = o.x * 100, y = o.y * 120;
        if (o.type === "text") {
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={(o.size ?? 0.1) * 100}
            fontFamily={resolveFont(o.font ?? "Bricolage Grotesque")} fontWeight={o.weight} fill={o.color ?? "#17142B"}>{o.text}</text>;
        }
        const w = (o.w ?? 0.2) * 100, h = (o.h ?? 0.2) * 100;
        if (o.shape === "circle") return <ellipse key={i} cx={x} cy={y} rx={w / 2} ry={h / 2} fill={o.fill} />;
        if (o.shape === "heart" || o.shape === "star") return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={h} fill={o.fill}>{o.shape === "heart" ? "♥" : "★"}</text>;
        return <rect key={i} x={x - w / 2} y={y - h / 2} width={w} height={h} fill={o.fill} />;
      })}
    </svg>
  );
}
