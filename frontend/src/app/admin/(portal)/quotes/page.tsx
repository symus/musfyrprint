"use client";

import { useEffect, useState } from "react";

import { apiFetch, postJson } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";
import type { QuoteView } from "@/lib/admin-types";

const STATUSES: QuoteView["status"][] = ["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST"];

export default function AdminQuotesPage() {
  const [filter, setFilter] = useState("");
  const [data, setData] = useState<Page<QuoteView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Page<QuoteView>>(`/api/v1/admin/quotes${filter ? `?status=${filter}` : ""}`).then(setData).catch((e) => setError(e.message));
  }, [filter]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Quote requests</h1>
      <label className="mt-6 flex items-center gap-2 text-sm">
        Status
        <select className="input !w-auto !py-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <ul className="mt-6 space-y-4">
        {data?.items.map((q) => (
          <li key={q.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-ink-soft">{q.reference} · {new Date(q.createdAt).toLocaleString()}</p>
                <p className="mt-1 font-display text-lg font-bold">{q.quantity} × {q.productInterest}</p>
                <p className="text-sm">
                  {q.contactName}{q.company ? ` · ${q.company}` : ""} · <a className="text-violet underline" href={`mailto:${q.email}`}>{q.email}</a>
                  {q.phone ? ` · ${q.phone}` : ""}
                </p>
                {q.neededBy && <p className="text-sm text-ink-soft">Needed by {q.neededBy}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">Status for {q.reference}</span>
                <select
                  className="input !w-auto !py-1.5"
                  value={q.status}
                  onChange={async (e) => {
                    const updated = await postJson<QuoteView>(`/api/v1/admin/quotes/${q.id}/status`, { status: e.target.value });
                    setData((d) => d && { ...d, items: d.items.map((x) => (x.id === updated.id ? updated : x)) });
                  }}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {q.message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-cloud p-3 text-sm">{q.message}</p>}
          </li>
        ))}
        {data && data.items.length === 0 && <li className="card p-6 text-center text-ink-soft">No requests.</li>}
      </ul>
    </div>
  );
}
