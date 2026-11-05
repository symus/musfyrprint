"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api/client";
import type { OrderSummary, Page } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

const ORDER_STATUSES = ["PENDING_PAYMENT", "PAYMENT_FAILED", "PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED", "REFUND_PENDING", "REFUNDED"];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<OrderSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), size: "25" });
    if (status) qs.set("status", status);
    if (query) qs.set("q", query);
    apiFetch<Page<OrderSummary>>(`/api/v1/admin/orders?${qs}`).then(setData).catch((e) => setError(e.message));
  }, [status, query, page]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Orders</h1>
      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPage(0); setQuery(q.trim()); }}>
        <label className="text-sm">Status
          <select className="input !py-2" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}>
            <option value="">All</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-sm">Order number or e-mail
          <input className="input !py-2" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-secondary !py-2">Search</button>
      </form>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-cloud"><tr><th className="p-3">Order</th><th>Created</th><th>Customer</th><th>Status</th><th>Items</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o.number} className="border-t border-line">
                <td className="p-3"><Link href={`/admin/orders/${o.number}`} className="font-mono text-violet underline">{o.number}</Link></td>
                <td>{new Date(o.createdAt).toLocaleString("en-GB")}</td>
                <td>{o.email}</td>
                <td><span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-bold">{o.status}</span></td>
                <td>{o.itemCount}</td>
                <td className="p-3 text-right tabular-nums">{formatMoney(o.total, "pl-PL")}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-soft">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button type="button" className="btn btn-secondary !py-1.5" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page + 1} of {data.totalPages}</span>
          <button type="button" className="btn btn-secondary !py-1.5" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
