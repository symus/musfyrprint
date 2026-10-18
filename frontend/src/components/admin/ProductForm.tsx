"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  AGE_GROUPS, FAMILIES, FITS, GARMENT_TYPES, GENDERS,
  type AdminCategory, type AdminColor, type AdminProductDetail,
} from "@/lib/admin-types";

export interface ProductFormValues {
  categoryId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  productFamily: string;
  garmentType: string;
  ageGroup: string;
  gender: string;
  fit: string;
  material: string;
  basePrice: string; // major units as typed by staff
  compareAtPrice: string;
  productionDaysMin: string;
  productionDaysMax: string;
  customizable: boolean;
  featured: boolean;
  tags: string;
  modelKey: string;
  colorCodes: string[];
}

export function valuesFrom(p?: AdminProductDetail): ProductFormValues {
  return {
    categoryId: p?.categoryId ?? "",
    slug: p?.slug ?? "",
    name: p?.name ?? "",
    shortDescription: p?.shortDescription ?? "",
    description: p?.description ?? "",
    productFamily: p?.productFamily ?? "APPAREL",
    garmentType: p?.garmentType ?? "TSHIRT",
    ageGroup: p?.ageGroup ?? "ADULT",
    gender: p?.gender ?? "UNISEX",
    fit: p?.fit ?? "REGULAR",
    material: p?.material ?? "",
    basePrice: p ? (p.basePriceMinor / 100).toFixed(2) : "",
    compareAtPrice: p?.compareAtMinor != null ? (p.compareAtMinor / 100).toFixed(2) : "",
    productionDaysMin: String(p?.productionDaysMin ?? 2),
    productionDaysMax: String(p?.productionDaysMax ?? 5),
    customizable: p?.customizable ?? true,
    featured: p?.featured ?? false,
    tags: p?.tags.join(", ") ?? "",
    modelKey: p?.modelKey ?? "",
    colorCodes: p?.colors.map((c) => c.code) ?? [],
  };
}

/** Converts form strings into the API request. Prices are sent as integer minor units. */
export function toRequest(v: ProductFormValues, version?: number) {
  const minor = (s: string) => (s.trim() === "" ? null : Math.round(Number(s.replace(",", ".")) * 100));
  return {
    categoryId: v.categoryId || null,
    slug: v.slug.trim(),
    name: v.name.trim(),
    shortDescription: v.shortDescription || null,
    description: v.description || null,
    productFamily: v.productFamily,
    garmentType: v.garmentType,
    ageGroup: v.ageGroup,
    gender: v.gender,
    fit: v.fit,
    material: v.material || null,
    basePriceMinor: minor(v.basePrice),
    compareAtMinor: minor(v.compareAtPrice),
    productionDaysMin: Number(v.productionDaysMin),
    productionDaysMax: Number(v.productionDaysMax),
    customizable: v.customizable,
    featured: v.featured,
    tags: v.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    modelKey: v.modelKey || null,
    colorCodes: v.colorCodes,
    version,
  };
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function ProductForm({ initial, submitLabel, onSubmit }: {
  initial: ProductFormValues;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [colors, setColors] = useState<AdminColor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  useEffect(() => {
    apiFetch<AdminCategory[]>("/api/v1/admin/categories").then(setCategories).catch(() => undefined);
    apiFetch<AdminColor[]>("/api/v1/admin/colors").then(setColors).catch(() => undefined);
  }, []);

  const set = <K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => setV((s) => ({ ...s, [k]: value }));
  const text = (k: keyof ProductFormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`pf-${k}`} className="label">{label}</label>
      <input
        id={`pf-${k}`}
        className="input"
        value={String(v[k])}
        aria-invalid={Boolean(errors[k])}
        onChange={(e) => set(k, e.target.value as never)}
        {...props}
      />
      {errors[k] && <p className="mt-1 text-sm text-danger">{errors[k]}</p>}
    </div>
  );
  const select = (k: keyof ProductFormValues, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label htmlFor={`pf-${k}`} className="label">{label}</label>
      <select id={`pf-${k}`} className="input" value={String(v[k])} onChange={(e) => set(k, e.target.value as never)} aria-invalid={Boolean(errors[k])}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {errors[k] && <p className="mt-1 text-sm text-danger">{errors[k]}</p>}
    </div>
  );
  const enumOptions = (values: string[]) => values.map((x) => ({ value: x, label: x }));

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setFormError(null);
        try {
          await onSubmit(v);
        } catch (err) {
          if (err instanceof ApiError) {
            const fe = err.fieldErrors();
            if (fe.basePriceMinor) fe.basePrice = fe.basePriceMinor;
            if (fe.compareAtMinor) fe.compareAtPrice = fe.compareAtMinor;
            setErrors(fe);
            setFormError(err.problem.detail ?? "Could not save.");
          } else setFormError("Network error.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <section className="card grid gap-5 p-6 md:grid-cols-2">
        <h2 className="text-xl font-bold md:col-span-2">Basics</h2>
        <div>
          <label htmlFor="pf-name" className="label">Name *</label>
          <input
            id="pf-name"
            className="input"
            value={v.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => setV((s) => ({ ...s, name: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))}
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>
        {text("slug", "URL slug *", { onInput: () => setSlugTouched(true) })}
        {select("categoryId", "Category *", [{ value: "", label: "Choose…" }, ...categories.map((c) => ({ value: c.id, label: c.name }))])}
        {select("productFamily", "Family *", enumOptions(FAMILIES))}
        <div className="md:col-span-2">{text("shortDescription", "Short description", { maxLength: 300 })}</div>
        <div className="md:col-span-2">
          <label htmlFor="pf-description" className="label">Description</label>
          <textarea id="pf-description" className="input" rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
        </div>
      </section>

      <section className="card grid gap-5 p-6 md:grid-cols-4">
        <h2 className="text-xl font-bold md:col-span-4">Attributes</h2>
        {select("garmentType", "Garment / 3D model type", enumOptions(GARMENT_TYPES))}
        {select("ageGroup", "Age group", enumOptions(AGE_GROUPS))}
        {select("gender", "Cut", enumOptions(GENDERS))}
        {select("fit", "Fit", enumOptions(FITS))}
        <div className="md:col-span-2">{text("material", "Material")}</div>
        {text("modelKey", "3D model key")}
        {text("tags", "Tags (comma separated)")}
      </section>

      <section className="card grid gap-5 p-6 md:grid-cols-4">
        <h2 className="text-xl font-bold md:col-span-4">Pricing & production</h2>
        {text("basePrice", "Base price (major units) *", { inputMode: "decimal" })}
        {text("compareAtPrice", "Compare-at price", { inputMode: "decimal" })}
        {text("productionDaysMin", "Production days min", { type: "number", min: 0, max: 60 })}
        {text("productionDaysMax", "Production days max", { type: "number", min: 0, max: 60 })}
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-violet" checked={v.customizable} onChange={(e) => set("customizable", e.target.checked)} /> Customisable in studio
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-violet" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on homepage
        </label>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold">Colours</h2>
        <p className="text-sm text-ink-soft">Colours offered for this product. Colours with variants cannot be removed.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {colors.map((c) => {
            const on = v.colorCodes.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                aria-pressed={on}
                onClick={() => set("colorCodes", on ? v.colorCodes.filter((x) => x !== c.code) : [...v.colorCodes, c.code])}
                className={`chip border-2 text-sm ${on ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
              >
                <span className="size-3 rounded-full ring-1 ring-line" style={{ background: c.hex }} /> {c.name}
              </button>
            );
          })}
        </div>
      </section>

      {formError && <p role="alert" className="text-danger">{formError}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
    </form>
  );
}
