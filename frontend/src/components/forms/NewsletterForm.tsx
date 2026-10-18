"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { postJson } from "@/lib/api/client";
import { brand } from "@/config/brand";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

export function NewsletterForm({ source, tone = "light" }: { source: string; tone?: "light" | "dark" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (status.kind === "done") {
    return (
      <p role="status" className={tone === "dark" ? "text-mint" : "text-success"}>
        Thanks! Your sign-up is recorded. We&apos;ll ask you to confirm by e-mail before sending any newsletter.
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
          setStatus({ kind: "error", message: "Please tick the consent box to subscribe." });
          return;
        }
        setStatus({ kind: "sending" });
        try {
          await postJson("/api/v1/newsletter/subscriptions", { email, consent, source, locale: brand.locale });
          setStatus({ kind: "done" });
        } catch (err) {
          const message = err instanceof ApiError
            ? err.status === 429 ? "Too many attempts – please try again later." : (err.fieldErrors().email ?? "Please enter a valid e-mail address.")
            : "Network error – please try again.";
          setStatus({ kind: "error", message });
        }
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">E-mail address</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? `${id}-err` : undefined}
        />
        <button type="submit" className={`btn shrink-0 ${tone === "dark" ? "bg-sun text-ink hover:bg-white" : "btn-primary"}`} disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Sending…" : "Subscribe"}
        </button>
      </div>
      <label className={`flex items-start gap-2 text-xs ${tone === "dark" ? "text-paper/70" : "text-ink-soft"}`}>
        <input type="checkbox" className="mt-0.5 size-4 accent-violet" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I agree to receive marketing e-mails and can unsubscribe at any time. See our{" "}
        <Link href="/help/privacy" className="underline">privacy policy</Link>.
      </label>
      {status.kind === "error" && (
        <p id={`${id}-err`} role="alert" className={`text-sm ${tone === "dark" ? "text-sun" : "text-danger"}`}>
          {status.message}
        </p>
      )}
    </form>
  );
}
