"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Link, useI18n } from "@/i18n/client";
import { apiFetch, postJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { OrderView } from "@/lib/api/types";
import { OrderDetail, StatusBadge } from "@/components/commerce/OrderDetail";

export function VerifyEmail() {
  const { t } = useI18n();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"busy" | "ok" | "bad">(token ? "busy" : "bad");
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !token) return; // tokens are single-use: never post twice (React strict mode re-runs effects)
    sent.current = true;
    postJson("/api/v1/auth/verify-email", { token }).then(() => setState("ok")).catch(() => setState("bad"));
  }, [token]);
  return (
    <div className="card mx-auto max-w-md p-6 text-center" aria-live="polite">
      <p className={state === "bad" ? "text-danger" : ""}>{state === "busy" ? t.account.verifyTitle : state === "ok" ? t.account.verified : t.account.linkInvalid}</p>
      {state !== "busy" && <Link href="/account" className="btn btn-primary mt-5">{t.account.title}</Link>}
    </div>
  );
}

export function ResetPassword() {
  const { t, locale } = useI18n();
  const a = t.account;
  const token = useSearchParams().get("token");
  const [state, setState] = useState<{ kind: "idle" | "busy" | "done" | "error"; message?: string }>({ kind: "idle" });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setState({ kind: "busy" });
    try {
      if (token) await postJson("/api/v1/auth/password-reset/confirm", { token, password: d.get("password") });
      else await postJson("/api/v1/auth/password-reset/request", { email: d.get("email"), locale });
      setState({ kind: "done" });
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      setState({ kind: "error", message: fields.password ?? (err instanceof ApiError && err.status === 400 && token ? a.linkInvalid : t.checkout.errorGeneric) });
    }
  };
  if (state.kind === "done") {
    return (
      <div className="card mx-auto max-w-md p-6 text-center" role="status">
        <p>{token ? a.passwordChanged : a.resetSent}</p>
        {token && <Link href="/account" className="btn btn-primary mt-5">{a.signIn}</Link>}
      </div>
    );
  }
  return (
    <form className="card mx-auto max-w-md space-y-4 p-6" onSubmit={submit}>
      {!token && <p className="text-sm text-ink-soft">{a.resetIntro}</p>}
      {token ? (
        <div>
          <label htmlFor="rp-password" className="label">{a.newPassword}</label>
          <input id="rp-password" name="password" type="password" className="input" required minLength={10} maxLength={200} autoComplete="new-password" />
          <p className="mt-1 text-xs text-ink-soft">{a.passwordHint}</p>
        </div>
      ) : (
        <div>
          <label htmlFor="rp-email" className="label">{a.email}</label>
          <input id="rp-email" name="email" type="email" className="input" required maxLength={255} autoComplete="email" />
        </div>
      )}
      {state.kind === "error" && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={state.kind === "busy"}>{token ? a.setPassword : a.resetSend}</button>
    </form>
  );
}

/** Order page for the account owner (no token) or a guest's secret e-mail link (?t=). */
export function OrderPage({ number, guest }: { number: string; guest: boolean }) {
  const { t } = useI18n();
  const token = useSearchParams().get("t");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<"login" | "missing" | null>(null);
  useEffect(() => {
    const path = guest ? `/api/v1/orders/${number}?token=${encodeURIComponent(token ?? "")}` : `/api/v1/account/orders/${number}`;
    apiFetch<OrderView>(path).then(setOrder).catch((e) => setError(e instanceof ApiError && e.status === 401 ? "login" : "missing"));
  }, [number, token, guest]);
  if (error === "login") return <p className="card p-6"><Link href={`/account?next=/account/orders/${number}`} className="text-violet underline">{t.account.signIn}</Link></p>;
  if (error) return <p role="alert" className="card p-6 text-danger">{t.account.linkInvalid}</p>;
  if (!order) return <p className="card p-6 text-ink-soft" aria-busy="true">{t.common.loading}</p>;
  return (
    <div className="space-y-6">
      <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold">{t.orders.number} {order.number} <StatusBadge status={order.status} /></h1>
      <OrderDetail order={order} />
    </div>
  );
}
