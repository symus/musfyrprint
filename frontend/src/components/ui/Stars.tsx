"use client";

import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";

export function Stars({ rating, count, size = "sm" }: { rating: number; count?: number; size?: "sm" | "md" }) {
  const { t, intl } = useI18n();
  const value = Math.round(Number(rating) * 10) / 10;
  const pct = Math.max(0, Math.min(100, (Number(rating) / 5) * 100));
  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "sm" ? "text-sm" : "text-lg"}`}>
      <span className="relative inline-block leading-none" aria-hidden="true">
        <span className="text-line">★★★★★</span>
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-sun" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
      <span className="sr-only">{fmt(t.product.rated, { value: value.toLocaleString(intl) })}</span>
      {count !== undefined && (
        <span className="text-xs text-ink-soft">
          {value.toLocaleString(intl, { minimumFractionDigits: 1 })} ({count.toLocaleString(intl)})
        </span>
      )}
    </span>
  );
}
