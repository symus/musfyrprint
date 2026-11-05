"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { apiFetch, postJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { OrderView } from "@/lib/api/types";
import { announceCartChange } from "./cart-client";
import { OrderDetail, StatusBadge } from "./OrderDetail";

const POLL_MS = 2500;
const POLL_LIMIT = 24; // ~1 minute; the page can be refreshed afterwards

/** Landing page after Przelewy24. The status always comes from the server, which only marks PAID after a verified notification. */
export function PaymentComplete() {
  const { t } = useI18n();
  const k = t.complete;
  const params = useSearchParams();
  const number = params.get("order") ?? "";
  const token = params.get("t");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [paying, setPaying] = useState(false);

  const validNumber = /^MP-\d{1,12}$/.test(number);
  useEffect(() => {
    if (!validNumber) return;
    let active = true;
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    apiFetch<OrderView>(`/api/v1/orders/${number}${qs}`)
      .then((o) => {
        if (!active) return;
        setOrder(o);
        if (o.status !== "PENDING_PAYMENT") announceCartChange();
      })
      .catch((e) => active && setError(e instanceof ApiError && e.status === 404 ? t.account.linkInvalid : t.common.errorText));
    return () => { active = false; };
  }, [number, token, polls, t, validNumber]);

  useEffect(() => {
    if (order?.status !== "PENDING_PAYMENT" || polls >= POLL_LIMIT) return;
    const id = setTimeout(() => setPolls((p) => p + 1), POLL_MS);
    return () => clearTimeout(id);
  }, [order, polls]);

  const retry = async () => {
    setPaying(true);
    try {
      const res = await postJson<{ url: string }>(`/api/v1/orders/${number}/pay`, { token });
      window.location.assign(res.url);
    } catch (e) {
      setPaying(false);
      setError(e instanceof ApiError ? (e.problem.detail ?? t.checkout.errorGeneric) : t.checkout.errorGeneric);
    }
  };

  if (!validNumber || error) return <p role="alert" className="card p-6 text-danger">{validNumber ? error : t.account.linkInvalid}</p>;
  if (!order) return <p className="card flex items-center gap-2 p-6" aria-busy="true"><Loader2 className="animate-spin" size={18} aria-hidden="true" />{k.checking}</p>;

  const paid = !["PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED"].includes(order.status);
  const failed = order.status === "PAYMENT_FAILED" || (order.status === "PENDING_PAYMENT" && polls >= POLL_LIMIT);
  return (
    <div className="space-y-6">
      <section className="card p-6" aria-live="polite">
        <div className="flex items-start gap-3">
          {paid ? <CheckCircle2 className="shrink-0 text-success" size={32} aria-hidden="true" />
            : failed ? <XCircle className="shrink-0 text-danger" size={32} aria-hidden="true" />
              : <Clock className="shrink-0 text-coral-strong" size={32} aria-hidden="true" />}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold">{paid ? k.paidTitle : failed ? k.failedTitle : k.pendingTitle}</h1>
            <p className="flex flex-wrap items-center gap-2 font-mono text-sm">{order.number} <StatusBadge status={order.status} /></p>
            <p>{paid ? fmt(k.paidText, { number: order.number, email: order.email }) : failed ? fmt(k.failedText, { number: order.number }) : k.pendingText}</p>
            {token && <p className="text-sm text-ink-soft">{k.keepLink}</p>}
          </div>
        </div>
        {order.canPay && (
          <button type="button" className="btn btn-primary mt-5" disabled={paying} onClick={retry}>
            {paying && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}{k.retry}
          </button>
        )}
      </section>
      <OrderDetail order={order} />
    </div>
  );
}
