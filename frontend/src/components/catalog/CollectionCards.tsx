"use client";

import { ArrowRight } from "lucide-react";

import type { CollectionView } from "@/lib/api/types";
import { Link, useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";

export function CollectionCards({ collections }: { collections: CollectionView[] }) {
  const { t } = useI18n();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/collections/${c.slug}`}
            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border-2 border-ink p-6 transition hover:shadow-[var(--shadow-pop)]"
            style={{ background: `${c.accentHex ?? "#FFC23C"}22` }}
          >
            <span aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full" style={{ background: c.accentHex ?? "#FFC23C", opacity: 0.35 }} />
            <span className="chip mb-4 w-fit bg-white text-ink">{t.labels.collectionKind[c.kind as keyof typeof t.labels.collectionKind] ?? c.kind}</span>
            <span className="font-display text-2xl font-extrabold">{c.name}</span>
            <span className="mt-2 text-ink-soft">{c.description}</span>
            <span className="mt-6 inline-flex items-center gap-1 font-semibold">
              {fmt(t.collections.explore, { count: c.productCount })} <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
