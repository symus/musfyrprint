import type { Messages } from "@/i18n/messages/en";
import { fmt } from "@/i18n/format";

export const SORT_VALUES = ["FEATURED", "NEWEST", "POPULAR", "RATING", "PRICE_ASC", "PRICE_DESC"] as const;

const pick = (map: Record<string, string>, v: string) => map[v] ?? v;

export const ageGroupLabel = (t: Messages, v: string) => pick(t.labels.ageGroup, v);
export const fitLabel = (t: Messages, v: string) => pick(t.labels.fit, v);
export const genderLabel = (t: Messages, v: string) => pick(t.labels.gender, v);
export const familyLabel = (t: Messages, v: string) => pick(t.labels.family, v);

/** Human label for supplier size codes such as "3-6M", "7.5x7.5CM", "ONE_SIZE". */
export function sizeLabel(t: Messages, code: string): string {
  if (code === "ONE_SIZE") return t.labels.oneSize;
  const months = code.match(/^(\d+)-(\d+)M$/);
  if (months) return fmt(t.labels.months, { a: months[1], b: months[2] });
  const years = code.match(/^(\d+)(?:-(\d+))?Y$/);
  if (years) return years[2] ? fmt(t.labels.yearsRange, { a: years[1], b: years[2] }) : fmt(t.labels.years, { a: years[1] });
  const cm = code.match(/^([\d.]+)x([\d.]+)CM$/);
  if (cm) return `${cm[1]} × ${cm[2]} cm`;
  return code;
}
