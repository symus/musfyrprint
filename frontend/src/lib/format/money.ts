import type { Money } from "@/lib/api/types";
import { brand } from "@/config/brand";

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, locale: string) {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, f);
  }
  return f;
}

/** Formats integer minor units (e.g. grosze) for display. Never do arithmetic on the formatted value. */
export function formatMoney(money: Money, locale: string = brand.locale): string {
  const f = formatter(money.currency, locale);
  const digits = f.resolvedOptions().maximumFractionDigits ?? 2;
  return f.format(money.amountMinor / 10 ** digits);
}

export function formatMinor(amountMinor: number, currency: string = brand.currency, locale: string = brand.locale) {
  return formatMoney({ amountMinor, currency }, locale);
}
