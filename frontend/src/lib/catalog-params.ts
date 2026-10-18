/** Shared mapping between storefront URL search params and the catalogue API query. */
export type SearchParams = Record<string, string | string[] | undefined>;

export const FILTER_KEYS = ["q", "family", "ageGroup", "gender", "fit", "color", "minPrice", "maxPrice", "sort", "page", "tag", "customizable"] as const;

const SORTS = new Set(["FEATURED", "NEWEST", "PRICE_ASC", "PRICE_DESC", "RATING", "POPULAR", "RELEVANCE"]);

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function all(v: string | string[] | undefined): string[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** Converts storefront search params (prices in whole currency units) into API params (minor units). */
export function toApiParams(sp: SearchParams, fixed: Record<string, string> = {}, pageSize = 24) {
  const toMinor = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
  };
  const sort = first(sp.sort)?.toUpperCase();
  const page = Math.max(0, Math.min(500, Number(first(sp.page) ?? "1") - 1 || 0));
  return {
    q: first(sp.q)?.slice(0, 100),
    family: first(sp.family),
    ageGroup: first(sp.ageGroup),
    gender: first(sp.gender),
    fit: first(sp.fit),
    color: all(sp.color).slice(0, 10),
    minPrice: toMinor(first(sp.minPrice)),
    maxPrice: toMinor(first(sp.maxPrice)),
    tag: first(sp.tag),
    customizable: first(sp.customizable) === "true" ? true : undefined,
    sort: sort && SORTS.has(sort) ? sort : first(sp.q) ? "RELEVANCE" : "FEATURED",
    page,
    size: pageSize,
    ...fixed,
  };
}

export function hrefWith(pathname: string, sp: SearchParams, changes: Record<string, string | string[] | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    all(v).forEach((value) => params.append(k, value));
  }
  for (const [k, v] of Object.entries(changes)) {
    params.delete(k);
    if (v === null) continue;
    (Array.isArray(v) ? v : [v]).forEach((value) => params.append(k, value));
  }
  if (!("page" in changes)) params.delete("page");
  const s = params.toString();
  return s ? `${pathname}?${s}` : pathname;
}
