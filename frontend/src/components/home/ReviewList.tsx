"use client";

import { BadgeCheck } from "lucide-react";

import type { ReviewView } from "@/lib/api/types";
import { Stars } from "@/components/ui/Stars";
import { Link, useI18n } from "@/i18n/client";

/** Renders only moderated, approved reviews from the database. Hidden when there are none. */
export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  const { t } = useI18n();
  if (reviews.length === 0) return null;
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {reviews.map((r) => (
        <li key={r.id} className="card p-6">
          <Stars rating={r.rating} />
          {r.title && <p className="mt-3 font-display text-lg font-bold">{r.title}</p>}
          {r.body && <p className="mt-2 text-ink-soft">{r.body}</p>}
          <p className="mt-4 flex items-center gap-2 text-sm">
            <span className="font-semibold">{r.authorName}</span>
            {r.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-success">
                <BadgeCheck size={16} aria-hidden="true" /> {t.product.verified}
              </span>
            )}
          </p>
          <Link href={`/products/${r.productSlug}`} className="mt-1 block text-xs text-violet hover:underline">
            {r.productName}
          </Link>
        </li>
      ))}
    </ul>
  );
}
