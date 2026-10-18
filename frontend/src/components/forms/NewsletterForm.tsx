"use client";

import { useId, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { postJson } from "@/lib/api/client";
import { Link, useI18n } from "@/i18n/client";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function NewsletterForm({ source, tone = "light" }: { source: string; tone?: "light" | "dark" }) {
  const { t, intl } = useI18n();
  const n = t.newsletter;
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (status.kind === "done") {
    return (
      <p role="status" className={tone === "dark" ? "text-mint" : "text-success"}>
        {n.done}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!consent) {
          setStatus({ kind: "error", message: n.errConsent });
          return;
        }
        setStatus({ kind: "sending" });
        try {
          await postJson("/api/v1/newsletter/subscriptions", { email, consent, source, locale: intl });
          setStatus({ kind: "done" });
        } catch (err) {
          const message = err instanceof ApiError
            ? err.status === 429 ? n.errRate : (err.fieldErrors().email ?? n.errEmail)
            : n.errNetwork;
          setStatus({ kind: "error", message });
        }
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">{n.email}</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder={n.placeholder}
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? `${id}-err` : undefined}
        />
        <button type="submit" className={`btn shrink-0 ${tone === "dark" ? "bg-sun text-ink hover:bg-white" : "btn-primary"}`} disabled={status.kind === "sending"}>
          {status.kind === "sending" ? n.sending : n.subscribe}
        </button>
      </div>
      <label className={`flex items-start gap-2 text-xs ${tone === "dark" ? "text-paper/70" : "text-ink-soft"}`}>
        <input type="checkbox" className="mt-0.5 size-4 accent-violet" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {n.consent} <Link href="/help/privacy" className="underline">{n.privacy}</Link>.
        </span>
      </label>
      {status.kind === "error" && (
        <p id={`${id}-err`} role="alert" className={`text-sm ${tone === "dark" ? "text-sun" : "text-danger"}`}>
          {status.message}
        </p>
      )}
    </form>
  );
}
