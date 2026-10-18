"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProductForm, toRequest, valuesFrom } from "@/components/admin/ProductForm";
import { postJson } from "@/lib/api/client";
import type { AdminProductDetail } from "@/lib/admin-types";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <div className="max-w-5xl">
      <Link href="/admin/products" className="text-sm text-violet hover:underline">← Products</Link>
      <h1 className="mb-6 mt-2 text-3xl font-extrabold">New product</h1>
      <ProductForm
        initial={valuesFrom()}
        submitLabel="Create draft"
        onSubmit={async (values) => {
          const created = await postJson<AdminProductDetail>("/api/v1/admin/products", toRequest(values));
          router.push(`/admin/products/${created.id}`);
        }}
      />
    </div>
  );
}
