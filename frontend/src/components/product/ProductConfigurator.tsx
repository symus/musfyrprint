"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Info, Palette, Printer, ShoppingBag } from "lucide-react";

import type { ProductDetail, SizeChart, SizeSystem } from "@/lib/api/types";
import { SizeGuide } from "@/components/sizing/SizeGuide";
import { addToCart } from "@/components/commerce/cart-client";
import { ApiError } from "@/lib/api/errors";
import { defaultSystem, loadSystem, saveSystem } from "@/components/sizing/units";
import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { GarmentArt } from "./GarmentArt";
import { Price } from "@/components/ui/Price";
import { formatMinor } from "@/lib/format/money";
import { sizeLabel } from "@/lib/format/labels";

const AVAILABILITY_CLASS = {
  IN_STOCK: "text-success",
  LOW_STOCK: "text-coral-strong",
  OUT_OF_STOCK: "text-danger",
  UNAVAILABLE: "text-danger",
} as const;

/**
 * Variant selection driven entirely by the product's database configuration (colours, sizes, options,
 * print areas and methods). Prices shown are indicative; the authoritative price is calculated server-side
 * at checkout.
 */
export function ProductConfigurator({ product }: { product: ProductDetail }) {
  const { t, intl, locale } = useI18n();
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [system, setSystem] = useState<SizeSystem>(defaultSystem(locale));

  // Size chart + remembered size system load after hydration (both are optional enhancements).
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/v1/catalog/products/${product.slug}/size-chart`, { headers: { "Accept-Language": locale }, signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: SizeChart | null) => {
        if (!c) return;
        setSystem(loadSystem(defaultSystem(locale)));
        setChart(c);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [product.slug, locale]);
  const changeSystem = (s: SizeSystem) => {
    setSystem(s);
    saveSystem(s);
  };
  const regionalLabel = (code: string) => chart?.rows.find((r) => r.sizeCode === code)?.labels[system];
  const [colorCode, setColorCode] = useState(product.colors[0]?.code ?? null);
  const [sizeCode, setSizeCode] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.optionGroups.map((g) => [g.code, g.values[0]?.code ?? ""])),
  );

  const color = product.colors.find((c) => c.code === colorCode) ?? null;
  const variantsForColor = useMemo(
    () => product.variants.filter((v) => v.colorCode === colorCode || (colorCode === null && v.colorCode === null)),
    [product.variants, colorCode],
  );
  const variant = variantsForColor.find((v) => v.sizeCode === sizeCode) ?? null;
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState<{ kind: "idle" | "busy" | "done" | "error"; message?: string }>({ kind: "idle" });
  const onAdd = async () => {
    if (!sizeCode) {
      setCartState({ kind: "error", message: t.cart.chooseSize });
      return;
    }
    setCartState({ kind: "busy" });
    try {
      await addToCart({ productSlug: product.slug, colorCode, sizeCode, quantity, options });
      setCartState({ kind: "done" });
    } catch (e) {
      setCartState({ kind: "error", message: e instanceof ApiError ? (e.problem.detail ?? t.checkout.errorGeneric) : t.checkout.errorGeneric });
    }
  };
  const optionDelta = product.optionGroups.reduce(
    (sum, g) => sum + (g.values.find((v) => v.code === options[g.code])?.priceDeltaMinor ?? 0),
    0,
  );
  const unit = (variant?.price ?? product.priceFrom).amountMinor + optionDelta;
  const sizes = Array.from(new Set(product.variants.map((v) => v.sizeCode)));
  const isAgeSized = sizes.some((s) => /^\d+(-\d+)?[MY]$/.test(s));

  const designQuery = new URLSearchParams({ ...(colorCode ? { color: colorCode } : {}), ...(sizeCode ? { size: sizeCode } : {}) }).toString();
  const designHref = `/design/${product.slug}${designQuery ? `?${designQuery}` : ""}`;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="card sticky top-20 flex aspect-square items-center justify-center self-start bg-cloud p-8">
        <GarmentArt
          printText={t.art.yourIdea}
          garmentType={product.garmentType}
          colorHex={color?.hex ?? "#FFFFFF"}
          title={`${product.name}${color ? ` ${t.product.in} ${color.name}` : ""}`}
          className="h-full w-full"
        />
      </div>

      <div>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{product.name}</h1>
        {product.shortDescription && <p className="mt-3 text-lg text-ink-soft">{product.shortDescription}</p>}
        <div className="mt-5 text-2xl" aria-live="polite">
          <Price value={{ amountMinor: unit, currency: product.priceFrom.currency }} compareAt={product.compareAt} from={!variant} />
          <p className="mt-1 text-xs text-ink-soft">{t.product.vatNote}</p>
        </div>

        {product.colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm font-bold">
              {t.product.colour}: <span className="font-normal">{color?.name}</span>
            </legend>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={c.code === colorCode}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setColorCode(c.code)}
                  className={`size-10 rounded-full border-2 ring-offset-2 transition ${c.code === colorCode ? "border-ink ring-2 ring-violet" : "border-line hover:scale-110"}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-bold">
              {t.product.size}{chart && <span className="font-normal text-ink-soft"> · {t.sizing.regions[system]}</span>}
            </legend>
            {chart && (
              <SizeGuide slug={product.slug} chart={chart} system={system} onSystemChange={changeSystem} onSelectSize={setSizeCode} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = variantsForColor.find((x) => x.sizeCode === s);
              const purchasable = v && (v.availability === "IN_STOCK" || v.availability === "LOW_STOCK");
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!purchasable}
                  aria-pressed={s === sizeCode}
                  onClick={() => setSizeCode(s)}
                  className={`min-w-14 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                    s === sizeCode ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"
                  } disabled:cursor-not-allowed disabled:border-dashed disabled:text-ink-soft disabled:line-through`}
                  aria-label={regionalLabel(s) && regionalLabel(s) !== s ? `${regionalLabel(s)} (${sizeLabel(t, s)})` : undefined}
                >
                  {regionalLabel(s) ?? sizeLabel(t, s)}
                  {regionalLabel(s) && regionalLabel(s) !== s && <span className="ml-1 text-xs font-normal opacity-70">{sizeLabel(t, s)}</span>}
                </button>
              );
            })}
          </div>
          {variant && (
            <p className={`mt-3 text-sm font-semibold ${AVAILABILITY_CLASS[variant.availability]}`}>
              {t.product.availability[variant.availability]} · {t.product.sku} {variant.sku}
            </p>
          )}
          {isAgeSized && (
            <p className="mt-3 flex gap-2 rounded-xl bg-sky/20 p-3 text-sm">
              <Info size={18} className="shrink-0 text-violet" aria-hidden="true" />
              {t.product.ageNotice}
            </p>
          )}
        </fieldset>

        {product.optionGroups.map((g) => (
          <fieldset key={g.code} className="mt-6">
            <legend className="mb-3 text-sm font-bold">{g.name}</legend>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => (
                <button
                  key={v.code}
                  type="button"
                  aria-pressed={options[g.code] === v.code}
                  onClick={() => setOptions((o) => ({ ...o, [g.code]: v.code }))}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                    options[g.code] === v.code ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"
                  }`}
                >
                  {v.label}
                  {v.priceDeltaMinor > 0 && <span className="ml-1 font-normal opacity-75">+{formatMinor(v.priceDeltaMinor, product.priceFrom.currency, intl)}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            {t.cart.quantity}
            <input type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="input !w-20 !py-2" />
          </label>
          <button type="button" className="btn btn-violet" onClick={onAdd} disabled={cartState.kind === "busy"}>
            <ShoppingBag size={18} aria-hidden="true" /> {cartState.kind === "busy" ? t.cart.adding : t.cart.add}
          </button>
        </div>
        <div aria-live="polite" className="mt-2 text-sm">
          {cartState.kind === "done" && <p className="font-semibold text-success">{t.cart.added} · <Link href="/cart" className="underline">{t.cart.open}</Link></p>}
          {cartState.kind === "error" && <p role="alert" className="text-danger">{cartState.message}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {product.customizable && (
            <Link href={designHref} className="btn btn-primary text-lg">
              <Palette size={20} aria-hidden="true" /> {t.product.personalise}
            </Link>
          )}
          <Link href="/custom-orders" className="btn btn-secondary">{t.product.bulk}</Link>
        </div>

        <dl className="mt-10 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
          <div className="flex gap-3">
            <Clock className="shrink-0 text-violet" size={20} aria-hidden="true" />
            <div>
              <dt className="font-bold">{t.product.productionTime}</dt>
              <dd className="text-ink-soft">
                {fmt(t.product.productionDays, { min: product.productionTime.minDays, max: product.productionTime.maxDays })}
              </dd>
            </div>
          </div>
          {product.printMethods.length > 0 && (
            <div className="flex gap-3">
              <Printer className="shrink-0 text-violet" size={20} aria-hidden="true" />
              <div>
                <dt className="font-bold">{t.product.printMethods}</dt>
                <dd className="text-ink-soft">{product.printMethods.map((m) => m.name).join(", ")}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
