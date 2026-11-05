"use client";

import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Money } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

/** Server-calculated totals. The client never computes prices; it only formats what the API returns. */
export function Totals({
  subtotal,
  discount,
  shipping,
  total,
  taxMode,
  taxIncluded,
  shippingKnown,
}: {
  subtotal: Money;
  discount: Money;
  shipping: Money;
  total: Money;
  taxMode: string;
  taxIncluded: Money;
  shippingKnown: boolean;
}) {
  const { t, intl } = useI18n();
  const c = t.cart;
  return (
    <div className="space-y-2 text-sm">
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt>{c.subtotal}</dt>
          <dd className="tabular-nums">{formatMoney(subtotal, intl)}</dd>
        </div>
        {discount.amountMinor > 0 && (
          <div className="flex justify-between text-success">
            <dt>{c.discount}</dt>
            <dd className="tabular-nums">−{formatMoney(discount, intl)}</dd>
          </div>
        )}
        {shippingKnown && (
          <div className="flex justify-between">
            <dt>{c.shipping}</dt>
            <dd className="tabular-nums">{formatMoney(shipping, intl)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
          <dt>{c.total}</dt>
          <dd className="tabular-nums" data-testid="order-total">
            {formatMoney(total, intl)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-ink-soft">
        {taxMode === "STANDARD"
          ? fmt(c.taxIncluded, { amount: formatMoney(taxIncluded, intl) })
          : c.taxExempt}
      </p>
    </div>
  );
}
