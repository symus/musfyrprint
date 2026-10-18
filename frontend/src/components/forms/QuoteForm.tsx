"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { ApiError } from "@/lib/api/errors";
import { postJson } from "@/lib/api/client";
import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";

type Fields = Record<"contactName" | "email" | "phone" | "company" | "productInterest" | "quantity" | "neededBy" | "message", string>;
const EMPTY: Fields = { contactName: "", email: "", phone: "", company: "", productInterest: "", quantity: "50", neededBy: "", message: "" };

export function QuoteForm({ productOptions }: { productOptions: string[] }) {
  const { t } = useI18n();
  const q = t.quote;
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  if (reference) {
    return (
      <div role="status" className="card p-8 text-center">
        <CheckCircle2 className="mx-auto text-success" size={48} aria-hidden="true" />
        <p className="mt-4 font-display text-2xl font-bold">{q.successTitle}</p>
        <p className="mt-2 text-ink-soft">{fmt(q.successText, { reference, email: fields.email })}</p>
      </div>
    );
  }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const field = (k: keyof Fields, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={`q-${k}`} className="label">{label}</label>
      {input}
      {errors[k] && <p id={`q-${k}-err`} className="mt-1 text-sm text-danger">{errors[k]}</p>}
    </div>
  );
  const common = (k: keyof Fields) => ({
    id: `q-${k}`,
    name: k,
    value: fields[k],
    onChange: set(k),
    className: "input",
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `q-${k}-err` : undefined,
  });

  return (
    <form
      noValidate
      className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setErrors({});
        setFormError(null);
        try {
          const res = await postJson<{ reference: string }>("/api/v1/quotes", {
            ...fields,
            phone: fields.phone || null,
            company: fields.company || null,
            neededBy: fields.neededBy || null,
            message: fields.message || null,
            quantity: Number(fields.quantity),
          });
          setReference(res.reference);
        } catch (err) {
          if (err instanceof ApiError && err.status === 400) setErrors(err.fieldErrors());
          else if (err instanceof ApiError && err.status === 429) setFormError(q.errRate);
          else setFormError(q.errGeneric);
        } finally {
          setSending(false);
        }
      }}
    >
      {field("contactName", q.name, <input {...common("contactName")} autoComplete="name" required maxLength={120} />)}
      {field("email", q.email, <input {...common("email")} type="email" autoComplete="email" required />)}
      {field("company", q.company, <input {...common("company")} autoComplete="organization" maxLength={160} />)}
      {field("phone", q.phone, <input {...common("phone")} type="tel" autoComplete="tel" maxLength={40} />)}
      {field("productInterest", q.product, (
        <select {...common("productInterest")} required>
          <option value="">{q.chooseProduct}</option>
          {productOptions.map((p) => <option key={p}>{p}</option>)}
          <option>{q.mixed}</option>
        </select>
      ))}
      {field("quantity", q.quantity, <input {...common("quantity")} type="number" min={10} max={100000} required />)}
      {field("neededBy", q.neededBy, <input {...common("neededBy")} type="date" />)}
      <div className="sm:col-span-2">
        {field("message", q.message, <textarea {...common("message")} rows={5} maxLength={4000} placeholder={q.messagePlaceholder} />)}
      </div>
      {formError && <p role="alert" className="text-danger sm:col-span-2">{formError}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? q.sending : q.submit}
        </button>
        <p className="mt-3 text-xs text-ink-soft">{q.privacyNote} <Link className="underline" href="/help/privacy">{q.privacy}</Link>.</p>
      </div>
    </form>
  );
}
