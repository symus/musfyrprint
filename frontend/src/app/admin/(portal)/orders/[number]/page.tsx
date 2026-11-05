"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { apiFetch, postJson } from "@/lib/api/client";
import type { OrderView } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

interface AdminOrder {
  order: OrderView;
  paymentEvents: { type: string; success: boolean; detail: string | null; at: string }[];
}

export default function AdminOrderPage() {
  const { number } = useParams<{ number: string }>();
  const [data, setData] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => apiFetch<AdminOrder>(`/api/v1/admin/orders/${number}`).then(setData).catch((e) => setError(e.message)), [number]);
  useEffect(() => { void load(); }, [load]);

  const act = async (path: string, body: unknown, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await postJson(path, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <p role="alert" className="text-danger">{error}</p>;
  if (!data) return <p className="text-ink-soft">Loading…</p>;
  const o = data.order;
  const money = (m: { amountMinor: number; currency: string }) => formatMoney(m, "pl-PL");
  const a = o.shippingAddress;
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-violet underline">← Orders</Link>
      <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold">
        {o.number} <span className="rounded-full bg-cloud px-3 py-1 text-sm">{o.status}</span>
      </h1>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Customer & delivery</h2>
          <p><a className="text-violet underline" href={`mailto:${o.email}`}>{o.email}</a></p>
          <p>{a.fullName}{a.company ? `, ${a.company}` : ""} · {a.phone}</p>
          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.postalCode} {a.city}, {a.country}</p>
          <p className="mt-2">Method: <b>{o.shippingMethod}</b>{o.pickupPoint ? ` · Paczkomat ${o.pickupPoint}` : ""}</p>
        </section>
        <section className="card space-y-1 p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Totals ({o.taxMode})</h2>
          <p>Subtotal {money(o.subtotal)} · Discount {money(o.discount)}{o.promotionCode ? ` (${o.promotionCode})` : ""} · Delivery {money(o.shipping)}</p>
          <p className="text-base font-bold">Total {money(o.total)}</p>
          {o.taxMode === "STANDARD" && <p>VAT included {money(o.taxIncluded)}</p>}
          <p>Payment: {o.paymentStatus ?? "–"}{o.paidAt ? ` · paid ${new Date(o.paidAt).toLocaleString("en-GB")}` : ""}</p>
        </section>
      </div>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-2 font-display text-lg font-bold">Items</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-ink-soft"><th>SKU</th><th>Product</th><th>Qty</th><th>Print areas</th><th>Design</th><th className="text-right">Line total</th></tr></thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n} className="border-t border-line">
                <td className="py-2 font-mono text-xs">{i.sku}</td><td>{i.productName} · {i.colorCode} · {i.sizeCode}</td><td>{i.quantity}</td>
                <td>{i.printZones.join(", ") || "–"}</td><td className="font-mono text-xs">{i.designId ?? "blank"}</td>
                <td className="text-right tabular-nums">{money(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Order timeline</h2>
          <ol className="space-y-1">{o.events.map((e, n) => <li key={n}>{new Date(e.at).toLocaleString("en-GB")} · <b>{e.status}</b>{e.note ? ` – ${e.note}` : ""}</li>)}</ol>
        </section>
        <section className="card p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Payment events</h2>
          <ol className="space-y-1">
            {data.paymentEvents.map((e, n) => (
              <li key={n} className={e.success ? "" : "text-danger"}>{new Date(e.at).toLocaleString("en-GB")} · <b>{e.type}</b>{e.detail ? ` – ${e.detail}` : ""}</li>
            ))}
            {data.paymentEvents.length === 0 && <li className="text-ink-soft">None.</li>}
          </ol>
        </section>
      </div>
      {(o.status === "PAID" || o.status === "REFUND_PENDING") && (
        <section className="card space-y-3 p-5 text-sm">
          <h2 className="font-display text-lg font-bold">Refund (admin only)</h2>
          {o.status === "PAID" ? (
            <>
              <p>Requests a full refund from Przelewy24. The order moves to REFUND_PENDING until you confirm it in the P24 panel.</p>
              <label className="block">Reason<input className="input !py-2" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
              <button type="button" className="btn bg-danger text-white" disabled={busy}
                onClick={() => act(`/api/v1/admin/orders/${o.number}/refund`, { reason: reason.trim() || null }, `Refund ${money(o.total)} for ${o.number}?`)}>
                Request refund
              </button>
            </>
          ) : (
            <>
              <p>Check in the Przelewy24 panel that the refund was completed, then confirm it here.</p>
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={() => act(`/api/v1/admin/orders/${o.number}/refund/confirm`, {}, `Confirm the refund for ${o.number} is complete?`)}>
                Confirm refund completed
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
