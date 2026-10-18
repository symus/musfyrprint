"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";
import type { AdminProductRow } from "@/lib/admin-types";
import { formatMoney } from "@/lib/format/money";

const STATUS_STYLE = { ACTIVE: "bg-mint-soft text-success", DRAFT: "bg-sun-soft text-ink", ARCHIVED: "bg-cloud text-ink-soft" };

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsTable />
    </Suspense>
  );
}

function ProductsTable() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<Page<AdminProductRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    apiFetch<Page<AdminProductRow>>(`/api/v1/admin/products?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v); else next.delete(k);
    if (k !== "page") next.delete("page");
    router.push(`${pathname}?${next}`);
  };
  const page = Number(params.get("page") ?? 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary"><Plus size={18} aria-hidden="true" /> New product</Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setParam("q", q); }} className="flex gap-2">
          <label htmlFor="admin-q" className="sr-only">Search products</label>
          <input id="admin-q" className="input !py-2" placeholder="Search name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-secondary !py-2" type="submit">Search</button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Status
          <select className="input !w-auto !py-2" value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-cloud/60 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Status</th>
              <th className="p-3">Base price</th><th className="p-3">Variants</th><th className="p-3">Stock</th><th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-line/60 hover:bg-cloud/40">
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold text-violet hover:underline">{p.name}</Link>
                  <p className="text-xs text-ink-soft">{p.slug}</p>
                </td>
                <td className="p-3">{p.categoryName}</td>
                <td className="p-3"><span className={`chip ${STATUS_STYLE[p.status]}`}>{p.status}</span></td>
                <td className="p-3">{formatMoney(p.basePrice)}</td>
                <td className="p-3">{p.variantCount}</td>
                <td className="p-3">{p.totalStock}</td>
                <td className="p-3 text-xs text-ink-soft">{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-ink-soft">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button className="btn btn-secondary !py-1.5" disabled={page <= 0} onClick={() => setParam("page", String(page - 1))}>Previous</button>
          <span>Page {page + 1} of {data.totalPages}</span>
          <button className="btn btn-secondary !py-1.5" disabled={page + 1 >= data.totalPages} onClick={() => setParam("page", String(page + 1))}>Next</button>
        </div>
      )}
    </div>
  );
}
