import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";

import en from "./messages/en";
import pl from "./messages/pl";
import { hasLocale, intlLocale, localePath, type Locale } from "./config";

const dictionaries = { en, pl } as const;

export function messagesFor(locale: Locale) {
  return dictionaries[locale];
}

/** Locale of the current request, read from the [locale] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!value || !hasLocale(value)) notFound();
  return value;
}

/** Everything a Server Component needs: locale, messages, Intl locale and a path helper. */
export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: dictionaries[locale],
    intl: intlLocale[locale],
    href: (path: string) => localePath(locale, path),
  };
}

/** hreflang alternates + canonical for a locale-independent path such as "/shop". */
export function alternates(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: { pl: localePath("pl", path), en: localePath("en", path), "x-default": localePath("pl", path) },
  };
}
