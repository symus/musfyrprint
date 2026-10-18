"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import type { Facets } from "@/lib/api/types";
import { ageGroupLabel, familyLabel, fitLabel, genderLabel, SORT_OPTIONS } from "@/lib/format/labels";

type Hidden = Partial<Record<"family" | "ageGroup" | "gender" | "fit", boolean>>;

/** Filter + sort controls. State lives in the URL so results are shareable, bookmarkable and SSR-friendly. */
export function FilterPanel({ facets, hide = {} }: { facets: Facets; hide?: Hidden }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    const s = next.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const setSingle = (key: string, value: string) => update((p) => (value ? p.set(key, value) : p.delete(key)));
  const toggleColor = (code: string) =>
    update((p) => {
      const current = p.getAll("color");
      p.delete("color");
      (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]).forEach((c) => p.append("color", c));
    });

  const selectedColors = params.getAll("color");
  const activeCount = ["family", "ageGroup", "gender", "fit", "minPrice", "maxPrice"].filter((k) => params.get(k)).length + selectedColors.length;

  const group = (key: "family" | "ageGroup" | "gender" | "fit", label: string, values: Facets["families"], fmt: (v: string) => string) =>
    hide[key] || values.filter((v) => v.value !== "NA").length < 2 ? null : (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {values.filter((v) => v.value !== "NA").map((v) => {
            const checked = params.get(key) === v.value;
            return (
              <button
                key={v.value}
                type="button"
                aria-pressed={checked}
                onClick={() => setSingle(key, checked ? "" : v.value)}
                className={`chip border text-sm ${checked ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"}`}
              >
                {fmt(v.value)} <span className={checked ? "text-paper/70" : "text-ink-soft"}>{v.count}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );

  const controls = (
    <div className="space-y-6">
      {group("family", "Product type", facets.families, familyLabel)}
      {group("ageGroup", "Age group", facets.ageGroups, ageGroupLabel)}
      {group("gender", "Cut", facets.genders, genderLabel)}
      {group("fit", "Fit", facets.fits, fitLabel)}
      {facets.colors.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const checked = selectedColors.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={checked}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => toggleColor(c.code)}
                  className={`size-8 rounded-full border-2 ring-offset-2 transition ${checked ? "border-ink ring-2 ring-violet" : "border-line hover:scale-110"}`}
                  style={{ background: c.hex }}
                />
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Price</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            update((p) => {
              for (const k of ["minPrice", "maxPrice"]) {
                const v = String(data.get(k) ?? "").trim();
                if (v) p.set(k, v);
                else p.delete(k);
              }
            });
          }}
        >
          <label className="sr-only" htmlFor="minPrice">Minimum price</label>
          <input id="minPrice" name="minPrice" type="number" min={0} inputMode="decimal" placeholder="Min" defaultValue={params.get("minPrice") ?? ""} className="input !py-2" />
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
          <input id="maxPrice" name="maxPrice" type="number" min={0} inputMode="decimal" placeholder="Max" defaultValue={params.get("maxPrice") ?? ""} className="input !py-2" />
          <button type="submit" className="btn btn-secondary !px-3 !py-2 text-sm">Go</button>
        </form>
      </fieldset>
      {activeCount > 0 && (
        <button
          type="button"
          className="text-sm font-semibold text-violet underline"
          onClick={() => update((p) => ["family", "ageGroup", "gender", "fit", "color", "minPrice", "maxPrice"].forEach((k) => p.delete(k)))}
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button type="button" className="btn btn-secondary !py-2 lg:hidden" onClick={() => setOpen(true)} aria-controls="filters-drawer" aria-expanded={open}>
          <SlidersHorizontal size={18} aria-hidden="true" /> Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="font-semibold">Sort by</span>
          <select
            className="input !w-auto !py-2"
            value={params.get("sort") ?? (params.get("q") ? "RELEVANCE" : "FEATURED")}
            onChange={(e) => setSingle("sort", e.target.value)}
          >
            {params.get("q") && <option value="RELEVANCE">Best match</option>}
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
      <aside className="hidden lg:block" aria-label="Filters">{controls}</aside>
      {open && (
        <div id="filters-drawer" role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close filters" className="flex-1 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="w-[85%] max-w-sm overflow-y-auto bg-paper p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display text-xl font-bold">Filters</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-full p-2 hover:bg-cloud"><X aria-hidden="true" /></button>
            </div>
            {controls}
            <button type="button" className="btn btn-primary mt-8 w-full" onClick={() => setOpen(false)}>Show results</button>
          </div>
        </div>
      )}
    </>
  );
}
