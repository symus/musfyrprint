"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Address, Profile } from "@/lib/api/types";
import { formatMinor } from "@/lib/format/money";
import { useCart } from "./cart-client";
import { Totals } from "./Totals";

type Form = {
  email: string; fullName: string; company: string; line1: string; line2: string; postalCode: string; city: string; phone: string;
  pickupPoint: string; customerNote: string; acceptTerms: boolean;
};
const EMPTY: Form = { email: "", fullName: "", company: "", line1: "", line2: "", postalCode: "", city: "", phone: "", pickupPoint: "", customerNote: "", acceptTerms: false };

/** Backend field paths → form fields. */
const FIELD: Record<string, keyof Form> = {
  email: "email", "shippingAddress.fullName": "fullName", "shippingAddress.company": "company", "shippingAddress.line1": "line1",
  "shippingAddress.line2": "line2", "shippingAddress.postalCode": "postalCode", "shippingAddress.city": "city",
  "shippingAddress.phone": "phone", pickupPoint: "pickupPoint", customerNote: "customerNote", acceptTerms: "acceptTerms", termsAccepted: "acceptTerms",
};

export function CheckoutPage() {
  const { t, locale, intl } = useI18n();
  const k = t.checkout;
  const [chosen, setMethod] = useState<string | null>(null);
  const [firstMethod, setFirstMethod] = useState<string | null>(null);
  // Until the customer picks one, quote the first (cheapest-listed) method so totals include delivery.
  const method = chosen ?? firstMethod;
  const { cart, error } = useCart(locale, method);
  if (cart && !firstMethod && cart.shippingMethods.length > 0) setFirstMethod(cart.shippingMethods[0].code);
  const [form, setForm] = useState<Form>(EMPTY);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout attempt: a double click or network retry never creates a second order.
  const idempotencyKey = useRef<string>("");
  useEffect(() => { idempotencyKey.current = crypto.randomUUID(); }, []);

  // Prefill from the customer account when signed in.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, addresses] = await Promise.all([
          apiFetch<Profile>("/api/v1/account/profile"), apiFetch<Address[]>("/api/v1/account/addresses"),
        ]);
        if (!active) return;
        const a = addresses.find((x) => x.isDefault) ?? addresses[0];
        setForm((f) => ({
          ...f, email: profile.email, phone: profile.phone ?? a?.phone ?? "", fullName: a?.fullName ?? profile.displayName,
          company: a?.company ?? "", line1: a?.line1 ?? "", line2: a?.line2 ?? "", postalCode: a?.postalCode ?? "", city: a?.city ?? "",
        }));
        setSignedIn(true);
      } catch {
        if (active) setSignedIn(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="card p-6 text-danger">{t.common.errorTitle}. {t.common.errorText}</p>;
  if (!cart) return <p className="card p-6 text-ink-soft" aria-busy="true">{t.common.loading}</p>;
  if (cart.lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg">{t.cart.empty}</p>
        <Link href="/shop" className="btn btn-primary mt-6">{t.cart.continue}</Link>
      </div>
    );
  }
  const selected = cart.shippingMethods.find((m) => m.code === method);
  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setMessage(null);
    setErrors({});
    try {
      const res = await apiFetch<{ orderNumber: string; accessToken: string; redirectUrl: string }>("/api/v1/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          email: form.email.trim(),
          shippingAddress: {
            fullName: form.fullName.trim(), company: form.company.trim() || null, line1: form.line1.trim(), line2: form.line2.trim() || null,
            postalCode: form.postalCode.trim(), city: form.city.trim(), country: "PL", phone: form.phone.trim(),
          },
          shippingMethod: selected.code,
          pickupPoint: selected.requiresPickupPoint ? form.pickupPoint.trim().toUpperCase() : null,
          promotionCode: cart.promotionCode,
          acceptTerms: form.acceptTerms,
          customerNote: form.customerNote.trim() || null,
          locale,
        }),
      });
      window.location.assign(res.redirectUrl);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        const mapped: Partial<Record<keyof Form, string>> = {};
        for (const [field, msg] of Object.entries(err.fieldErrors())) if (FIELD[field]) mapped[FIELD[field]] = msg;
        setErrors(mapped);
        setMessage(Object.keys(mapped).length > 0 ? k.fixErrors : (err.problem.detail ?? k.errorGeneric));
        // A rejected request was not stored, but a new attempt after a change gets a fresh key anyway.
        idempotencyKey.current = crypto.randomUUID();
      } else {
        setMessage(k.errorGeneric); // network failure: keep the key so a retry can't duplicate the order
      }
    }
  };

  const field = (name: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={`co-${name}`} className="label">{label}</label>
      <input id={`co-${name}`} className="input" value={form[name] as string} onChange={set(name)}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] || hint ? `co-${name}-help` : undefined} {...props} />
      {(errors[name] || hint) && (
        <p id={`co-${name}-help`} className={`mt-1 text-xs ${errors[name] ? "text-danger" : "text-ink-soft"}`}>{errors[name] ?? hint}</p>
      )}
    </div>
  );

  return (
    <form className="grid gap-8 lg:grid-cols-[1fr_22rem]" onSubmit={submit} noValidate>
      <div className="space-y-6">
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 font-display text-xl font-bold">{k.contact}</legend>
          {signedIn === false && (
            <p className="text-sm">{k.signInHint} <Link href="/account?next=/checkout" className="text-violet underline">{k.signIn}</Link></p>
          )}
          {field("email", k.email, { type: "email", autoComplete: "email", required: true, maxLength: 255 })}
        </fieldset>

        <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
          <legend className="px-1 font-display text-xl font-bold">{k.address}</legend>
          <div className="sm:col-span-2">{field("fullName", k.fullName, { autoComplete: "name", required: true, maxLength: 120 })}</div>
          <div className="sm:col-span-2">{field("company", k.company, { autoComplete: "organization", maxLength: 160 })}</div>
          <div className="sm:col-span-2">{field("line1", k.line1, { autoComplete: "address-line1", required: true, maxLength: 200 })}</div>
          <div className="sm:col-span-2">{field("line2", k.line2, { autoComplete: "address-line2", maxLength: 200 })}</div>
          {field("postalCode", k.postalCode, { autoComplete: "postal-code", required: true, inputMode: "numeric", placeholder: "00-000", pattern: "\\d{2}-\\d{3}" })}
          {field("city", k.city, { autoComplete: "address-level2", required: true, maxLength: 120 })}
          <div>
            <span className="label">{k.country}</span>
            <p className="input bg-cloud">{k.poland}</p>
          </div>
          {field("phone", k.phone, { type: "tel", autoComplete: "tel", required: true }, k.phoneHint)}
        </fieldset>

        <fieldset className="card space-y-3 p-5">
          <legend className="px-1 font-display text-xl font-bold">{k.delivery}</legend>
          {cart.shippingMethods.map((m) => (
            <label key={m.code} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${m.code === method ? "border-ink" : "border-line"}`}>
              <input type="radio" name="shippingMethod" value={m.code} checked={m.code === method} onChange={() => setMethod(m.code)} />
              <span className="flex-1">
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-xs text-ink-soft">{fmt(k.days, { min: m.daysMin, max: m.daysMax })}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatMinor(m.priceMinor, m.currency, intl)}</span>
            </label>
          ))}
          {selected?.requiresPickupPoint && field("pickupPoint", k.locker, { required: true, maxLength: 12, className: "input uppercase" }, k.lockerHint)}
        </fieldset>

        <div className="card p-5">
          <label htmlFor="co-note" className="label">{k.note}</label>
          <textarea id="co-note" className="input min-h-20" maxLength={500} value={form.customerNote} onChange={set("customerNote")} />
        </div>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold">{k.summary}</h2>
        <ul className="space-y-1 text-sm">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2"><span>{l.quantity} × {l.productName}</span></li>
          ))}
        </ul>
        <Totals {...cart} shippingKnown={Boolean(cart.shippingMethod)} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.acceptTerms} onChange={set("acceptTerms")} className="mt-1" aria-invalid={errors.acceptTerms ? true : undefined} />
          <span>
            {k.terms.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
              part === "{terms}" ? <Link key={i} href="/help/terms" className="text-violet underline">{k.termsLink}</Link>
                : part === "{privacy}" ? <Link key={i} href="/help/privacy" className="text-violet underline">{k.privacyLink}</Link>
                  : part)}
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-danger">{errors.acceptTerms}</p>}
        <div aria-live="polite">{message && <p role="alert" className="text-sm text-danger">{message}</p>}</div>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting || !selected || !form.acceptTerms}>
          {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
          {submitting ? k.paying : k.pay}
        </button>
        <p className="text-xs text-ink-soft">{k.payHint}</p>
      </aside>
    </form>
  );
}
