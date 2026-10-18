export function Stars({ rating, count, size = "sm" }: { rating: number; count?: number; size?: "sm" | "md" }) {
  const value = Math.round(Number(rating) * 10) / 10;
  const pct = Math.max(0, Math.min(100, (Number(rating) / 5) * 100));
  const dim = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`inline-flex items-center gap-1.5 ${dim}`}>
      <span className="relative inline-block leading-none" aria-hidden="true">
        <span className="text-line">★★★★★</span>
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-sun" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="sr-only">Rated {value} out of 5</span>
      {count !== undefined && (
        <span className="text-xs text-ink-soft">
          {value.toFixed(1)} ({count.toLocaleString()})
        </span>
      )}
    </span>
  );
}
