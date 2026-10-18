"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";
import type { AdminProductRow, QuoteView } from "@/lib/admin-types";

interface Stats {
  active: number;
  drafts: number;
  total: number;
  newQuotes: number | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [active, drafts, products, quotes] = await Promise.all([
        apiFetch<Page<AdminProductRow>>("/api/v1/admin/products?status=ACTIVE&size=1").catch(() => null),
        apiFetch<Page<AdminProductRow>>("/api/v1/admin/products?status=DRAFT&size=1").catch(() => null),
        apiFetch<Page<AdminProductRow>>("/api/v1/admin/products?size=1").catch(() => null),
        apiFetch<Page<QuoteView>>("/api/v1/admin/quotes?status=NEW&size=1").catch(() => null),
      ]);
      setStats({
        active: active?.totalItems ?? 0,
        drafts: drafts?.totalItems ?? 0,
        total: products?.totalItems ?? 0,
        newQuotes: quotes?.totalItems ?? null,
      });
    })();
  }, []);

  const tiles = [
    { label: "Active products", value: stats?.active, href: "/admin/products?status=ACTIVE" },
    { label: "Drafts", value: stats?.drafts, href: "/admin/products?status=DRAFT" },
    { label: "All products", value: stats?.total, href: "/admin/products" },
    { label: "New quote requests", value: stats?.newQuotes ?? "—", href: "/admin/quotes" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Dashboard</h1>
      <p className="mt-1 text-ink-soft">Revenue, conversion and order metrics appear here once checkout is live (Phase 3).</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="card block p-5 hover:shadow-[var(--shadow-pop)]">
              <p className="text-sm text-ink-soft">{t.label}</p>
              <p className="mt-2 font-display text-4xl font-extrabold">{t.value ?? "…"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
