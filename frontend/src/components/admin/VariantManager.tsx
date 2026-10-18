"use client";

import { useState } from "react";

import { postJson, putJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AdminProductDetail, AdminVariant } from "@/lib/admin-types";
import { formatMinor } from "@/lib/format/money";

export function VariantManager({ product, onChange }: { product: AdminProductDetail; onChange: (p: AdminProductDetail) => void }) {
  const [sizes, setSizes] = useState("S, M, L, XL");
  const [stock, setStock] = useState("20");
  const [prefix, setPrefix] = useState(product.slug.replace(/[^a-z0-9]/g, "").slice(0, 6).toUpperCase() || "SKU");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="card mt-8 p-6">
      <h2 className="text-xl font-bold">Variants & inventory</h2>
      <p className="text-sm text-ink-soft">One variant per colour × size. Prices left empty use the base price.</p>

      <form
        className="mt-4 grid gap-3 rounded-xl bg-cloud p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setMessage(null);
          try {
            onChange(await postJson<AdminProductDetail>(`/api/v1/admin/products/${product.id}/variants/generate`, {
              sizeCodes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
              initialStock: Number(stock),
              skuPrefix: prefix,
            }));
            setMessage("Missing variants generated for all product colours.");
          } catch (err) {
            setMessage(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed");
          }
        }}
      >
        <div><label className="label" htmlFor="vm-sizes">Sizes (supplier codes)</label><input id="vm-sizes" className="input" value={sizes} onChange={(e) => setSizes(e.target.value)} /></div>
        <div><label className="label" htmlFor="vm-stock">Initial stock</label><input id="vm-stock" type="number" min={0} className="input" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
        <div><label className="label" htmlFor="vm-prefix">SKU prefix</label><input id="vm-prefix" className="input" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} /></div>
        <button className="btn btn-primary" type="submit">Generate</button>
      </form>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="p-2">SKU</th><th className="p-2">Colour</th><th className="p-2">Size</th><th className="p-2">Price override</th><th className="p-2">Stock</th><th className="p-2">Active</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {product.variants.map((v) => (
              <VariantRow key={`${v.id}-${v.version}`} variant={v} productId={product.id} currency={product.currency}
                onSaved={(saved) => onChange({ ...product, variants: product.variants.map((x) => (x.id === saved.id ? saved : x)) })} />
            ))}
            {product.variants.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-ink-soft">No variants yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VariantRow({ variant, productId, currency, onSaved }: {
  variant: AdminVariant;
  productId: string;
  currency: string;
  onSaved: (v: AdminVariant) => void;
}) {
  const [price, setPrice] = useState(variant.priceMinor != null ? (variant.priceMinor / 100).toFixed(2) : "");
  const [stock, setStock] = useState(String(variant.stockQuantity));
  const [active, setActive] = useState(variant.active);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const dirty = price !== (variant.priceMinor != null ? (variant.priceMinor / 100).toFixed(2) : "") || stock !== String(variant.stockQuantity) || active !== variant.active;

  return (
    <tr className="border-b border-line/60">
      <td className="p-2 font-mono text-xs">{variant.sku}</td>
      <td className="p-2">{variant.colorCode ?? "—"}</td>
      <td className="p-2">{variant.sizeCode}</td>
      <td className="p-2">
        <label className="sr-only" htmlFor={`p-${variant.id}`}>Price override for {variant.sku}</label>
        <input id={`p-${variant.id}`} className="input !w-28 !py-1" inputMode="decimal" placeholder={formatMinor(variant.effectivePriceMinor, currency)} value={price} onChange={(e) => setPrice(e.target.value)} />
      </td>
      <td className="p-2">
        <label className="sr-only" htmlFor={`s-${variant.id}`}>Stock for {variant.sku}</label>
        <input id={`s-${variant.id}`} type="number" min={0} className="input !w-24 !py-1" value={stock} onChange={(e) => setStock(e.target.value)} />
      </td>
      <td className="p-2">
        <input type="checkbox" aria-label={`Active ${variant.sku}`} className="size-4 accent-violet" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="p-2">
        <button
          type="button"
          disabled={!dirty || state === "saving"}
          className="btn btn-secondary !px-3 !py-1 text-xs"
          onClick={async () => {
            setState("saving");
            try {
              onSaved(await putJson<AdminVariant>(`/api/v1/admin/products/${productId}/variants/${variant.id}`, {
                priceMinor: price.trim() === "" ? null : Math.round(Number(price.replace(",", ".")) * 100),
                stockQuantity: Number(stock),
                trackInventory: variant.trackInventory,
                active,
                version: variant.version,
              }));
              setState("idle");
            } catch {
              setState("error");
            }
          }}
        >
          {state === "saving" ? "…" : state === "error" ? "Retry" : "Save"}
        </button>
      </td>
    </tr>
  );
}
