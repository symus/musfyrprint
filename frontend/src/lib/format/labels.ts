const AGE_GROUPS: Record<string, string> = {
  BABY: "Baby",
  TODDLER: "Toddler",
  KIDS: "Kids",
  TEEN: "Teens",
  ADULT: "Adults",
  NA: "All",
};

const FITS: Record<string, string> = {
  REGULAR: "Regular fit",
  SLIM: "Slim fit",
  FITTED: "Fitted",
  OVERSIZED: "Oversized",
  RELAXED: "Relaxed fit",
  NA: "—",
};

const GENDERS: Record<string, string> = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", NA: "—" };

const FAMILIES: Record<string, string> = { APPAREL: "Apparel", STICKER: "Stickers", MERCH: "Merch" };

export const SORT_OPTIONS = [
  { value: "FEATURED", label: "Featured" },
  { value: "NEWEST", label: "Newest" },
  { value: "POPULAR", label: "Most popular" },
  { value: "RATING", label: "Top rated" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
] as const;

export const ageGroupLabel = (v: string) => AGE_GROUPS[v] ?? v;
export const fitLabel = (v: string) => FITS[v] ?? v;
export const genderLabel = (v: string) => GENDERS[v] ?? v;
export const familyLabel = (v: string) => FAMILIES[v] ?? v;

/** Human label for supplier size codes such as "3-6M", "7.5x7.5CM", "ONE_SIZE". */
export function sizeLabel(code: string): string {
  if (code === "ONE_SIZE") return "One size";
  const months = code.match(/^(\d+)-(\d+)M$/);
  if (months) return `${months[1]}–${months[2]} months`;
  const years = code.match(/^(\d+)(?:-(\d+))?Y$/);
  if (years) return years[2] ? `${years[1]}–${years[2]} years` : `${years[1]} years`;
  const cm = code.match(/^([\d.]+)x([\d.]+)CM$/);
  if (cm) return `${cm[1]} × ${cm[2]} cm`;
  return code;
}
