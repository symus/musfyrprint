import type { Money } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

export function Price({ value, compareAt, from = false, className }: {
  value: Money;
  compareAt?: Money | null;
  from?: boolean;
  className?: string;
}) {
  const discounted = compareAt && compareAt.amountMinor > value.amountMinor;
  return (
    <span className={`inline-flex items-baseline gap-2 ${className ?? ""}`}>
      {from && <span className="text-xs font-medium text-ink-soft">from</span>}
      <span className={`font-bold ${discounted ? "text-coral-strong" : ""}`}>{formatMoney(value)}</span>
      {discounted && (
        <span className="text-sm text-ink-soft line-through">
          <span className="sr-only">was </span>
          {formatMoney(compareAt)}
        </span>
      )}
    </span>
  );
}
