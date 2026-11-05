"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Link, useI18n } from "@/i18n/client";
import { postJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { announceCartChange } from "@/components/commerce/cart-client";

/** Sign in or create an account. Both merge the guest cart on the server and set the HttpOnly session cookie. */
export function AuthForms({ onSignedIn }: { onSignedIn: () => void }) {
  const { t, locale } = useI18n();
  const a = t.account;
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      if (mode === "signin") {
        await postJson("/api/v1/auth/login", { email: data.get("email"), password: data.get("password") });
      } else {
        await postJson("/api/v1/auth/register", {
          email: data.get("email"), password: data.get("password"), displayName: data.get("displayName"),
          acceptTerms: data.get("acceptTerms") === "on", marketingOptIn: data.get("marketingOptIn") === "on", locale,
        });
      }
      announceCartChange();
      onSignedIn();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.status === 401 ? a.invalid : (err.problem.detail ?? t.checkout.errorGeneric));
      } else {
        setError(t.checkout.errorGeneric);
      }
    }
  };
  const err = (name: string) => fieldErrors[name] && <p className="mt-1 text-xs text-danger">{fieldErrors[name]}</p>;

  return (
    <div className="mx-auto max-w-md">
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-cloud p-1">
        {(["signin", "register"] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
            className={`rounded-xl py-2 font-semibold ${mode === m ? "bg-white shadow-sm" : "text-ink-soft"}`}>
            {m === "signin" ? a.signIn : a.register}
          </button>
        ))}
      </div>
      <form className="card space-y-4 p-6" onSubmit={submit} key={mode}>
        {mode === "register" && (
          <div>
            <label htmlFor="acc-name" className="label">{a.name}</label>
            <input id="acc-name" name="displayName" className="input" required maxLength={120} autoComplete="name" />
            {err("displayName")}
          </div>
        )}
        <div>
          <label htmlFor="acc-email" className="label">{a.email}</label>
          <input id="acc-email" name="email" type="email" className="input" required maxLength={255} autoComplete="email" />
          {err("email")}
        </div>
        <div>
          <label htmlFor="acc-password" className="label">{a.password}</label>
          <input id="acc-password" name="password" type="password" className="input" required maxLength={200} minLength={mode === "register" ? 10 : undefined}
            autoComplete={mode === "register" ? "new-password" : "current-password"} aria-describedby={mode === "register" ? "acc-password-hint" : undefined} />
          {mode === "register" && <p id="acc-password-hint" className="mt-1 text-xs text-ink-soft">{a.passwordHint}</p>}
          {err("password")}
        </div>
        {mode === "register" && (
          <>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="acceptTerms" required className="mt-1" />
              <span>
                {t.checkout.terms.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
                  part === "{terms}" ? <Link key={i} href="/help/terms" className="text-violet underline">{t.checkout.termsLink}</Link>
                    : part === "{privacy}" ? <Link key={i} href="/help/privacy" className="text-violet underline">{t.checkout.privacyLink}</Link> : part)}
              </span>
            </label>
            {err("termsAccepted")}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="marketingOptIn" className="mt-1" /><span>{a.marketing}</span>
            </label>
          </>
        )}
        <div aria-live="polite">{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {mode === "signin" ? a.signIn : a.register}
        </button>
        {mode === "signin" && <Link href="/account/reset-password" className="block text-center text-sm text-violet underline">{a.forgot}</Link>}
      </form>
    </div>
  );
}
