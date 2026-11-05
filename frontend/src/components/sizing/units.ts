import type { MeasureRange, SizeSystem } from "@/lib/api/types";
import type { Locale } from "@/i18n/config";

export type Unit = "cm" | "in";
export const CM_PER_INCH = 2.54;

export const toDisplay = (cm: number, unit: Unit) => (unit === "cm" ? Math.round(cm) : Math.round((cm / CM_PER_INCH) * 2) / 2);
export const toCm = (value: number, unit: Unit) => (unit === "cm" ? value : value * CM_PER_INCH);

export function formatRange(r: MeasureRange | null, unit: Unit, intl: string): string {
  if (!r || (r.min == null && r.max == null)) return "–";
  const f = (v: number) => toDisplay(v, unit).toLocaleString(intl);
  if (r.min != null && r.max != null) return r.min === r.max ? f(r.min) : `${f(r.min)}–${f(r.max)}`;
  return r.min != null ? `≥ ${f(r.min)}` : `≤ ${f(r.max as number)}`;
}

/** Sensible first choice: EU for Polish visitors, UK for English ones; remembered per browser afterwards. */
export const defaultSystem = (locale: Locale): SizeSystem => (locale === "pl" ? "EU" : "UK");
const KEY = "musfir.sizeSystem";

export function loadSystem(fallback: SizeSystem): SizeSystem {
  try {
    const v = localStorage.getItem(KEY);
    return v && ["EU", "UK", "US", "CN", "IN"].includes(v) ? (v as SizeSystem) : fallback;
  } catch {
    return fallback;
  }
}

export function saveSystem(system: SizeSystem) {
  try {
    localStorage.setItem(KEY, system);
  } catch {
    // storage unavailable (private mode) – the choice simply isn't remembered
  }
}
