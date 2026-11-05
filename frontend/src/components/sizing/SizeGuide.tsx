"use client";

import { useId, useRef, useState } from "react";
import { Info, Ruler, X } from "lucide-react";

import { postJson } from "@/lib/api/client";
import type { SizeChart, SizeRecommendation, SizeSystem } from "@/lib/api/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { sizeLabel } from "@/lib/format/labels";
import { formatRange, toCm, toDisplay, type Unit } from "./units";

/** Size guide dialog: regional labels, body & garment measurements, measuring help and the size finder. */
export function SizeGuide({ slug, chart, system, onSystemChange, onSelectSize }: {
  slug: string;
  chart: SizeChart;
  system: SizeSystem;
  onSystemChange: (s: SizeSystem) => void;
  onSelectSize: (sizeCode: string) => void;
}) {
  const { t, intl } = useI18n();
  const s = t.sizing;
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [unit, setUnit] = useState<Unit>("cm");
  const hasAge = chart.rows.some((r) => r.ageMinMonths != null);
  const hasWaist = chart.rows.some((r) => r.waist);
  const label = (code: string) => {
    const regional = chart.rows.find((r) => r.sizeCode === code)?.labels[system];
    return regional ? `${regional} (${sizeLabel(t, code)})` : sizeLabel(t, code);
  };
  const ageText = (min: number | null, max: number | null) => {
    if (min == null || max == null) return "–";
    return max <= 24 ? fmt(s.months, { a: min, b: max }) : fmt(s.years, { a: Math.floor(min / 12), b: Math.floor(max / 12) });
  };

  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-violet underline" onClick={() => dialog.current?.showModal()}>
        <Ruler size={16} aria-hidden="true" /> {s.guide}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-[var(--radius-card)] bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/50"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <h2 id={`${id}-title`} className="text-2xl font-extrabold">{s.title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={s.close} className="rounded-full p-2 hover:bg-cloud">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-6 p-5">
          {chart.source === "REFERENCE" && (
            <p className="flex gap-2 rounded-xl bg-sun-soft p-3 text-sm"><Info size={18} className="shrink-0 text-coral-strong" aria-hidden="true" />{s.reference}</p>
          )}
          {chart.fitNote && <p className="font-semibold">{chart.fitNote}</p>}

          <div className="flex flex-wrap items-center gap-4">
            <fieldset className="flex flex-wrap items-center gap-1">
              <legend className="sr-only">{s.region}</legend>
              <span className="mr-1 text-sm font-bold" aria-hidden="true">{s.region}:</span>
              {chart.systems.map((sys) => (
                <button key={sys} type="button" aria-pressed={sys === system} onClick={() => onSystemChange(sys)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${sys === system ? "bg-ink text-paper" : "bg-white ring-1 ring-line hover:ring-ink"}`}>
                  {s.regions[sys]}
                </button>
              ))}
            </fieldset>
            <fieldset className="flex items-center gap-1">
              <legend className="sr-only">{s.units}</legend>
              {(["cm", "in"] as const).map((u) => (
                <button key={u} type="button" aria-pressed={u === unit} onClick={() => setUnit(u)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${u === unit ? "bg-violet text-white" : "bg-white ring-1 ring-line hover:ring-ink"}`}>
                  {u}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
              <caption className="sr-only">{s.title}</caption>
              <thead className="bg-cloud/70 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th scope="col" className="p-3">{s.size} ({s.regions[system]})</th>
                  {hasAge && <th scope="col" className="p-3">{s.age}</th>}
                  <th scope="col" className="p-3">{s.height} ({unit})</th>
                  <th scope="col" className="p-3">{s.chest} ({unit})</th>
                  {hasWaist && <th scope="col" className="p-3">{s.waist} ({unit})</th>}
                  <th scope="col" className="p-3">{s.garmentWidth} ({unit})</th>
                  <th scope="col" className="p-3">{s.garmentLength} ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((r) => (
                  <tr key={r.sizeCode} className="border-t border-line/70">
                    <th scope="row" className="p-3 font-bold">
                      {r.labels[system] ?? r.sizeCode}
                      <span className="ml-2 text-xs font-normal text-ink-soft">{sizeLabel(t, r.sizeCode)}</span>
                    </th>
                    {hasAge && <td className="p-3">{ageText(r.ageMinMonths, r.ageMaxMonths)}</td>}
                    <td className="p-3">{formatRange(r.height, unit, intl)}</td>
                    <td className="p-3">{formatRange(r.chest, unit, intl)}</td>
                    {hasWaist && <td className="p-3">{formatRange(r.waist, unit, intl)}</td>}
                    <td className="p-3">{r.garmentWidth != null ? toDisplay(r.garmentWidth, unit).toLocaleString(intl) : "–"}</td>
                    <td className="p-3">{r.garmentLength != null ? toDisplay(r.garmentLength, unit).toLocaleString(intl) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-soft">{s.labelsNote}{hasAge ? ` ${s.approxAge}` : ""}</p>

          <div className="grid gap-6 md:grid-cols-2">
            <MeasureHelp />
            <SizeFinder slug={slug} unit={unit} hasAge={hasAge} label={label}
              onSelect={(code) => { onSelectSize(code); dialog.current?.close(); }} />
          </div>
        </div>
      </dialog>
    </>
  );
}

function MeasureHelp() {
  const { t } = useI18n();
  return (
    <section className="rounded-xl bg-cloud p-4">
      <h3 className="mb-3 text-lg font-bold">{t.sizing.howTo}</h3>
      <div className="flex gap-4">
        <svg viewBox="0 0 80 160" className="h-40 w-20 shrink-0" aria-hidden="true">
          <circle cx="40" cy="16" r="11" fill="#F4C9A8" />
          <path d="M22 34 h36 l8 46 h-10 l-4 -30 v100 h-12 v-60 h-0 v60 h-12 v-100 l-4 30 h-10 z" fill="#C9B8F5" />
          <line x1="16" y1="52" x2="64" y2="52" stroke="#C4301E" strokeWidth="2.5" strokeDasharray="4 2" />
          <line x1="20" y1="76" x2="60" y2="76" stroke="#12795F" strokeWidth="2.5" strokeDasharray="4 2" />
          <line x1="74" y1="5" x2="74" y2="158" stroke="#17142B" strokeWidth="1.5" />
          <text x="12" y="50" fontSize="9" fontWeight="700" fill="#C4301E">2</text>
          <text x="12" y="74" fontSize="9" fontWeight="700" fill="#12795F">3</text>
          <text x="66" y="90" fontSize="9" fontWeight="700" fill="#17142B">1</text>
        </svg>
        <ol className="list-decimal space-y-2 pl-4 text-sm text-ink-soft">
          {t.sizing.howToItems.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </div>
    </section>
  );
}

function SizeFinder({ slug, unit, hasAge, label, onSelect }: {
  slug: string;
  unit: Unit;
  hasAge: boolean;
  label: (code: string) => string;
  onSelect: (code: string) => void;
}) {
  const { t } = useI18n();
  const s = t.sizing;
  const [values, setValues] = useState({ height: "", chest: "", waist: "", age: "", fit: "REGULAR" });
  const [result, setResult] = useState<SizeRecommendation | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const field = (key: "height" | "chest" | "waist" | "age", text: string) => (
    <div>
      <label htmlFor={`sf-${key}`} className="label">{text}</label>
      <input id={`sf-${key}`} type="number" inputMode="decimal" min={0} className="input !py-2" value={values[key]}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
    </div>
  );

  return (
    <section className="rounded-xl border-2 border-ink p-4">
      <h3 className="text-lg font-bold">{s.finder}</h3>
      <p className="mb-3 text-sm text-ink-soft">{s.finderIntro}</p>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("busy");
          const h = num(values.height), c = num(values.chest), w = num(values.waist), a = num(values.age);
          try {
            setResult(await postJson<SizeRecommendation>(`/api/v1/catalog/products/${slug}/size-recommendation`, {
              heightCm: h == null ? null : toCm(h, unit),
              chestCm: c == null ? null : toCm(c, unit),
              waistCm: w == null ? null : toCm(w, unit),
              ageMonths: a == null ? null : Math.round(a),
              fit: values.fit,
            }));
            setState("idle");
          } catch {
            setResult(null);
            setState("error");
          }
        }}
      >
        {field("height", `${s.height} (${unit})`)}
        {field("chest", `${s.chest} (${unit})`)}
        {field("waist", `${s.waist} (${unit})`)}
        {hasAge && field("age", s.ageMonths)}
        <fieldset className="col-span-2">
          <legend className="label">{s.fit}</legend>
          <div className="flex flex-wrap gap-2">
            {(["CLOSER", "REGULAR", "LOOSER"] as const).map((f) => (
              <label key={f} className={`cursor-pointer rounded-full px-3 py-1 text-sm font-semibold ring-1 ${values.fit === f ? "bg-ink text-paper ring-ink" : "bg-white ring-line"}`}>
                <input type="radio" name="fit" value={f} checked={values.fit === f} onChange={() => setValues((v) => ({ ...v, fit: f }))} className="sr-only" />
                {s.fits[f]}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn-primary col-span-2" disabled={state === "busy"}>
          {state === "busy" ? s.recommending : s.recommend}
        </button>
      </form>
      <div aria-live="polite" className="mt-4">
        {state === "error" && <p role="alert" className="text-sm text-danger">{s.error}</p>}
        {result && (
          <div className="rounded-xl bg-mint-soft p-4">
            {result.sizeCode && <p className="font-display text-xl font-extrabold">{fmt(s.result, { size: label(result.sizeCode) })}</p>}
            <p className="text-sm font-semibold">{s.confidence[result.confidence]}</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {result.reasons.map((r) => <li key={r}>{s.reasons[r] ?? r}</li>)}
              {result.alternativeSizeCode && <li>{fmt(s.alternative, { size: label(result.alternativeSizeCode) })}</li>}
            </ul>
            {result.sizeCode && (
              <button type="button" className="btn btn-violet mt-3 !py-2" onClick={() => onSelect(result.sizeCode as string)}>
                {fmt(s.select, { size: label(result.sizeCode) })}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
