"use client";

import { useState } from "react";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";

import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { apiFetch, putJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cart, CartLine } from "@/lib/api/types";
import { formatMinor, formatMoney } from "@/lib/format/money";
import { sizeLabel } from "@/lib/format/labels";
import { announceCartChange, useCart } from "./cart-client";
import { Totals } from "./Totals";

export function CartPage() {
  const { t, locale, intl } = useI18n();
  const c = t.cart;
  const { cart, error, setCart } = useCart(locale);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const mutate = async (fn: () => Promise<Cart>) => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await fn();
      setCart(next);
      announceCartChange(next);
    } catch (e) {
      setMessage(e instanceof ApiError ? (e.problem.detail ?? t.checkout.errorGeneric) : t.checkout.errorGeneric);
    } finally {
      setBusy(false);
    }
  };
  const setQty = (line: CartLine, quantity: number) =>
    quantity >= 1 && mutate(() => putJson<Cart>(`/api/v1/cart/items/${line.id}`, { quantity }));
  const remove = (line: CartLine) => mutate(() => apiFetch<Cart>(`/api/v1/cart/items/${line.id}`, { method: "DELETE" }));
  const applyPromo = (value: string) => mutate(() => putJson<Cart>("/api/v1/cart/promotion", { code: value.trim() }));

  if (error) return <p role="alert" className="card p-6 text-danger">{t.common.errorTitle}. {t.common.errorText}</p>;
  if (!cart) return <p className="card p-6 text-ink-soft" aria-busy="true">{t.common.loading}</p>;
  if (cart.lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg">{c.empty}</p>
        <Link href="/shop" className="btn btn-primary mt-6">{c.continue}</Link>
      </div>
    );
  }
  const cheapestShipping = cart.shippingMethods.reduce<number | null>((m, s) => (m === null || s.priceMinor < m ? s.priceMinor : m), null);
  const blocked = cart.lines.some((l) => !l.available || l.stockShortfall > 0 || l.designErrors.some((d) => d.severity === "ERROR"));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-4" aria-busy={busy}>
        {cart.lines.map((l) => (
          <li key={l.id} className="card flex flex-wrap gap-4 p-4" data-testid="cart-line">
            <span className="size-16 shrink-0 rounded-xl border border-line" style={{ background: l.colorHex ?? "#fff" }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Link href={`/products/${l.productSlug}`} className="font-display text-lg font-bold hover:underline">{l.productName}</Link>
              <p className="text-sm text-ink-soft">
                {[l.colorName, sizeLabel(t, l.sizeCode), ...Object.values(l.options)].filter(Boolean).join(" · ")}
              </p>
              {l.designId && (
                <p className="text-sm">
                  {c.design} · {c.printAreas}: {l.printZones.join(", ") || "–"} ·{" "}
                  <Link href={`/design/${l.productSlug}?design=${l.designId}`} className="text-violet underline">{c.editDesign}</Link>
                </p>
              )}
              {l.volumePercent > 0 && <p className="text-sm text-success">{fmt(c.volume, { percent: l.volumePercent })}</p>}
              {!l.available && <p className="text-sm text-danger">{c.unavailable}</p>}
              {l.stockShortfall > 0 && <p className="text-sm text-danger">{c.lowStock}</p>}
              {l.designErrors.length > 0 && (
                <div className="mt-1 text-sm text-danger">
                  <p className="flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" />{c.designNeedsFix}</p>
                  <ul className="ml-5 list-disc">
                    {l.designErrors.map((d, i) => {
                      const key = d.code === "LOW_RESOLUTION" && d.severity === "ERROR" ? "LOW_RESOLUTION_ERROR" : d.code;
                      const text = t.studio.warn[key as keyof typeof t.studio.warn];
                      return <li key={i}>{text ? fmt(text, { zone: d.zone ?? "", dpi: d.value ?? "", min: "" }) : d.code}</li>;
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="font-bold tabular-nums">{formatMoney(l.lineTotal, intl)}</p>
              <p className="text-xs text-ink-soft tabular-nums">{formatMoney(l.unitPrice, intl)} {c.each}</p>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-lg border border-line p-1.5 hover:border-ink disabled:opacity-40" aria-label={`${c.quantity} −1`}
                  disabled={busy || l.quantity <= 1} onClick={() => setQty(l, l.quantity - 1)}><Minus size={14} aria-hidden="true" /></button>
                <input type="number" min={1} max={10000} defaultValue={l.quantity} key={l.quantity} aria-label={`${c.quantity}: ${l.productName}`}
                  className="input !w-16 !py-1 text-center" onBlur={(e) => { const q = Number(e.target.value); if (q !== l.quantity) setQty(l, q); }} />
                <button type="button" className="rounded-lg border border-line p-1.5 hover:border-ink disabled:opacity-40" aria-label={`${c.quantity} +1`}
                  disabled={busy} onClick={() => setQty(l, l.quantity + 1)}><Plus size={14} aria-hidden="true" /></button>
                <button type="button" className="ml-2 rounded-lg p-1.5 text-danger hover:bg-cloud" aria-label={`${c.remove}: ${l.productName}`}
                  disabled={busy} onClick={() => remove(l)}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card h-fit space-y-5 p-5">
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void applyPromo(code); }}>
          <label htmlFor="promo" className="label">{c.promo}</label>
          {cart.promotionCode && !cart.promotionError ? (
            <p className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2 text-sm">
              <span className="font-mono font-bold">{cart.promotionCode}</span>
              <button type="button" className="text-violet underline" onClick={() => applyPromo("")}>{c.removePromo}</button>
            </p>
          ) : (
            <div className="flex gap-2">
              <input id="promo" className="input !py-2 uppercase" value={code} maxLength={40} pattern="[A-Za-z0-9_-]*" onChange={(e) => setCode(e.target.value)} />
              <button type="submit" className="btn btn-secondary !py-2" disabled={busy || !code.trim()}>{c.apply}</button>
            </div>
          )}
          {cart.promotionError && <p role="alert" className="text-sm text-danger">{c.promoErrors[cart.promotionError] ?? c.promoErrors.INVALID}</p>}
        </form>
        <Totals {...cart} shippingKnown={false} />
        {cheapestShipping !== null && (
          <p className="text-sm text-ink-soft">{c.shipping}: {fmt(c.shippingFrom, { price: formatMinor(cheapestShipping, cart.total.currency, intl) })}</p>
        )}
        {message && <p role="alert" className="text-sm text-danger">{message}</p>}
        {blocked ? (
          <button type="button" className="btn btn-primary w-full" disabled>{c.checkout}</button>
        ) : (
          <Link href="/checkout" className="btn btn-primary w-full">{c.checkout}</Link>
        )}
        <Link href="/shop" className="block text-center text-sm text-violet underline">{c.continue}</Link>
      </aside>
    </div>
  );
}
