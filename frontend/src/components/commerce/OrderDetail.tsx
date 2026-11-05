"use client";

import { useI18n } from "@/i18n/client";
import type { OrderView } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";
import { sizeLabel } from "@/lib/format/labels";
import { Totals } from "./Totals";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const tone = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(status) ? "bg-success/15 text-success"
    : ["PAYMENT_FAILED", "CANCELLED"].includes(status) ? "bg-danger/10 text-danger" : "bg-cloud text-ink";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`} data-testid="order-status">{t.orders.statuses[status] ?? status}</span>;
}

export function OrderDetail({ order }: { order: OrderView }) {
  const { t, intl } = useI18n();
  const o = t.orders;
  const a = order.shippingAddress;
  const date = (iso: string) => new Date(iso).toLocaleString(intl, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold">{o.items}</h2>
          <ul className="divide-y divide-line">
            {order.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">{i.quantity} × {i.productName}</span>
                  <span className="block text-ink-soft">{[i.colorCode, sizeLabel(t, i.sizeCode), i.printZones.length ? `${t.cart.printAreas}: ${i.printZones.join(", ")}` : ""].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="tabular-nums">{formatMoney(i.lineTotal, intl)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold">{o.timeline}</h2>
          <ol className="space-y-2 text-sm">
            {order.events.map((e, n) => (
              <li key={n} className="flex flex-wrap gap-x-3"><span className="text-ink-soft">{date(e.at)}</span><span className="font-semibold">{o.statuses[e.status] ?? e.status}</span></li>
            ))}
          </ol>
        </section>
      </div>
      <aside className="space-y-4">
        <section className="card space-y-1 p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">{o.delivery}</h2>
          <p>{a.fullName}{a.company ? `, ${a.company}` : ""}</p>
          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
          <p>{a.postalCode} {a.city}</p>
          {a.phone && <p>{a.phone}</p>}
          {order.pickupPoint && <p className="pt-2 font-semibold">{o.pickup}: {order.pickupPoint}</p>}
        </section>
        <section className="card p-5">
          <Totals {...order} shippingKnown />
        </section>
      </aside>
    </div>
  );
}
