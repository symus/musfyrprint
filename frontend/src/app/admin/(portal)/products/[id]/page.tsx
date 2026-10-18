"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ProductForm, toRequest, valuesFrom } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";
import { apiFetch, postJson, putJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AdminProductDetail } from "@/lib/admin-types";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(() => apiFetch<AdminProductDetail>(`/api/v1/admin/products/${id}`).then(setProduct), [id]);
  useEffect(() => {
    load().catch((e) => setNotice({ kind: "error", text: e.message }));
  }, [load]);

  if (!product) return <p aria-busy="true">Loading…</p>;

  const changeStatus = async (status: string) => {
    try {
      setProduct(await postJson<AdminProductDetail>(`/api/v1/admin/products/${id}/status`, { status }));
      setNotice({ kind: "ok", text: `Status changed to ${status}.` });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof ApiError ? (e.problem.detail ?? e.message) : "Failed" });
    }
  };

  return (
    <div className="max-w-5xl">
      <Link href="/admin/products" className="text-sm text-violet hover:underline">← Products</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{product.name}</h1>
          <p className="text-sm text-ink-soft">Status: <strong>{product.status}</strong> · version {product.version}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.status !== "ACTIVE" && <button className="btn btn-violet !py-2" onClick={() => changeStatus("ACTIVE")}>Publish</button>}
          {product.status === "ACTIVE" && <button className="btn btn-secondary !py-2" onClick={() => changeStatus("DRAFT")}>Unpublish</button>}
          {product.status !== "ARCHIVED" && <button className="btn btn-secondary !py-2" onClick={() => changeStatus("ARCHIVED")}>Archive</button>}
          {product.status === "ACTIVE" && <Link className="btn btn-secondary !py-2" href={`/products/${product.slug}`} target="_blank">View in shop</Link>}
        </div>
      </div>
      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`mb-6 rounded-xl p-3 text-sm ${notice.kind === "ok" ? "bg-mint-soft text-success" : "bg-red-50 text-danger"}`}>
          {notice.text}
        </p>
      )}
      <ProductForm
        key={formKey}
        initial={valuesFrom(product)}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          const updated = await putJson<AdminProductDetail>(`/api/v1/admin/products/${id}`, toRequest(values, product.version));
          setProduct(updated);
          setFormKey((k) => k + 1);
          setNotice({ kind: "ok", text: "Saved." });
        }}
      />
      <VariantManager product={product} onChange={setProduct} />
    </div>
  );
}
