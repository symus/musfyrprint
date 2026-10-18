export const locales = ["pl", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pl";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** BCP-47 locale used for number, currency and date formatting per UI language. */
export const intlLocale: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };

export const localeNames: Record<Locale, string> = { pl: "Polski", en: "English" };

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Prefixes an internal path with the locale: ("pl", "/shop") -> "/pl/shop". */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Picks the best supported locale from an Accept-Language header. */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => hasLocale(r.lang))?.lang as Locale ?? defaultLocale;
}
