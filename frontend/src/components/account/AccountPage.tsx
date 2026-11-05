"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";

import { Link, useI18n } from "@/i18n/client";
import { apiFetch, postJson, putJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Address, OrderSummary, Profile } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";
import { announceCartChange } from "@/components/commerce/cart-client";
import { StatusBadge } from "@/components/commerce/OrderDetail";
import { AuthForms } from "./AuthForms";

export function AccountPage() {
  const { t, href } = useI18n();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    apiFetch<Profile>("/api/v1/account/profile")
      .then((p) => active && setProfile(p))
      .catch((e) => active && setProfile(e instanceof ApiError && (e.status === 401 || e.status === 403) ? null : undefined));
    return () => { active = false; };
  }, [version]);

  if (profile === undefined) return <p className="card p-6 text-ink-soft" aria-busy="true">{t.common.loading}</p>;
  if (profile === null) {
    return (
      <AuthForms onSignedIn={() => {
        // Only same-site relative paths are followed.
        if (next && /^\/[a-z0-9/_-]*$/i.test(next)) router.push(href(next));
        else load();
      }} />
    );
  }
  return <Dashboard profile={profile} onChange={setProfile} onSignOut={() => setProfile(null)} />;
}

function Dashboard({ profile, onChange, onSignOut }: { profile: Profile; onChange: (p: Profile) => void; onSignOut: () => void }) {
  const { t, intl } = useI18n();
  const a = t.account;
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [resent, setResent] = useState(false);
  useEffect(() => { apiFetch<OrderSummary[]>("/api/v1/account/orders").then(setOrders).catch(() => setOrders([])); }, []);

  const signOut = async () => {
    await postJson("/api/v1/auth/logout", {});
    announceCartChange();
    onSignOut();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg">{profile.displayName} · <span className="text-ink-soft">{profile.email}</span></p>
        <button type="button" className="btn btn-secondary !py-2" onClick={signOut}><LogOut size={16} aria-hidden="true" />{a.signOut}</button>
      </div>
      {!profile.emailVerified && (
        <p className="card flex flex-wrap items-center gap-3 border-coral p-4 text-sm" role="status">
          {a.verifyBanner}
          {resent ? <span className="font-semibold">{a.resent}</span> : (
            <button type="button" className="text-violet underline" onClick={async () => { await postJson("/api/v1/account/verify-email/resend", {}).catch(() => undefined); setResent(true); }}>
              {a.resend}
            </button>
          )}
        </p>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold">{t.orders.title}</h2>
        {orders === null ? <p className="text-ink-soft">{t.common.loading}</p> : orders.length === 0 ? <p className="text-ink-soft">{t.orders.none}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-ink-soft"><th className="py-2">{t.orders.number}</th><th>{t.orders.date}</th><th>{t.orders.status}</th><th className="text-right">{t.orders.total}</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.number} className="border-t border-line">
                    <td className="py-2"><Link href={`/account/orders/${o.number}`} className="font-mono text-violet underline">{o.number}</Link></td>
                    <td>{new Date(o.createdAt).toLocaleDateString(intl)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right tabular-nums">{formatMoney(o.total, intl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm profile={profile} onChange={onChange} />
        <Addresses />
      </div>
      <DeleteAccount requested={profile.deletionRequested} onDone={() => onChange({ ...profile, deletionRequested: true })} />
    </div>
  );
}

function ProfileForm({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const { t } = useI18n();
  const a = t.account;
  const [state, setState] = useState<{ kind: "idle" | "busy" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setState({ kind: "busy" });
    try {
      onChange(await putJson<Profile>("/api/v1/account/profile", {
        displayName: d.get("displayName"), phone: d.get("phone") ?? "", marketingOptIn: d.get("marketingOptIn") === "on",
        preferredSizeSystem: d.get("preferredSizeSystem") ?? "", preferredLocale: d.get("preferredLocale") ?? "",
      }));
      setState({ kind: "saved" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? (err.problem.detail ?? t.checkout.errorGeneric) : t.checkout.errorGeneric });
    }
  };
  return (
    <form className="card space-y-4 p-5" onSubmit={submit}>
      <h2 className="font-display text-xl font-bold">{a.profile}</h2>
      <div><label htmlFor="pf-name" className="label">{a.name}</label><input id="pf-name" name="displayName" className="input" required maxLength={120} defaultValue={profile.displayName} /></div>
      <div><label htmlFor="pf-phone" className="label">{a.phone}</label><input id="pf-phone" name="phone" type="tel" className="input" defaultValue={profile.phone ?? ""} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-size" className="label">{a.sizeSystem}</label>
          <select id="pf-size" name="preferredSizeSystem" className="input" defaultValue={profile.preferredSizeSystem ?? ""}>
            <option value="">–</option>{["EU", "UK", "US", "CN", "IN"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-lang" className="label">{a.language}</label>
          <select id="pf-lang" name="preferredLocale" className="input" defaultValue={profile.preferredLocale ?? ""}>
            <option value="">–</option><option value="pl">Polski</option><option value="en">English</option>
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketingOptIn" defaultChecked={profile.marketingOptIn} className="mt-1" />{a.marketing}</label>
      <div aria-live="polite" className="text-sm">
        {state.kind === "saved" && <p className="text-success">{a.saved}</p>}
        {state.kind === "error" && <p role="alert" className="text-danger">{state.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={state.kind === "busy"}>{a.save}</button>
    </form>
  );
}

function Addresses() {
  const { t } = useI18n();
  const a = t.account;
  const k = t.checkout;
  const [list, setList] = useState<Address[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { apiFetch<Address[]>("/api/v1/account/addresses").then(setList).catch(() => setList([])); }, []);
  const run = async (fn: () => Promise<Address[]>) => {
    setError(null);
    try {
      setList(await fn());
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fieldErrors())[0] ?? err.problem.detail ?? k.errorGeneric : k.errorGeneric);
      return false;
    }
  };
  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (await run(() => postJson<Address[]>("/api/v1/account/addresses", { ...d, country: "PL", isDefault: d.isDefault === "on" }))) setAdding(false);
  };
  const body = (x: Address, isDefault: boolean) => ({ ...x, isDefault });

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-display text-xl font-bold">{a.addresses}</h2>
      <ul className="space-y-3">
        {list?.map((x) => (
          <li key={x.id} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-semibold">{x.fullName} {x.isDefault && <span className="ml-2 rounded-full bg-cloud px-2 text-xs">{a.defaultAddress}</span>}</p>
            <p>{x.line1}{x.line2 ? `, ${x.line2}` : ""}, {x.postalCode} {x.city}</p>
            <div className="mt-2 flex gap-4">
              {!x.isDefault && <button type="button" className="text-violet underline" onClick={() => run(() => putJson<Address[]>(`/api/v1/account/addresses/${x.id}`, body(x, true)))}>{a.makeDefault}</button>}
              <button type="button" className="text-danger underline" onClick={() => run(() => apiFetch<Address[]>(`/api/v1/account/addresses/${x.id}`, { method: "DELETE" }))}>{a.delete}</button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {adding ? (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={add}>
          {([["fullName", k.fullName, true], ["company", k.company, false], ["line1", k.line1, true], ["line2", k.line2, false],
            ["postalCode", k.postalCode, true], ["city", k.city, true], ["phone", k.phone, false]] as const).map(([name, label, required]) => (
            <div key={name} className={["fullName", "line1", "company", "line2"].includes(name) ? "sm:col-span-2" : ""}>
              <label htmlFor={`ad-${name}`} className="label">{label}</label>
              <input id={`ad-${name}`} name={name} className="input" required={required} placeholder={name === "postalCode" ? "00-000" : undefined} />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" />{a.defaultAddress}</label>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary !py-2">{a.save}</button>
            <button type="button" className="btn btn-secondary !py-2" onClick={() => setAdding(false)}>×</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary !py-2" onClick={() => setAdding(true)}>{a.addAddress}</button>
      )}
    </section>
  );
}

function DeleteAccount({ requested, onDone }: { requested: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-display text-xl font-bold">{a.deleteTitle}</h2>
      <p className="text-sm text-ink-soft">{a.deleteText}</p>
      {requested ? <p className="text-sm font-semibold" role="status">{a.deleteRequested}</p> : confirming ? (
        <button type="button" className="btn bg-danger text-white" onClick={async () => { await postJson("/api/v1/account/deletion-request", {}); onDone(); }}>{a.deleteButton}</button>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>{a.deleteButton}…</button>
      )}
    </section>
  );
}
