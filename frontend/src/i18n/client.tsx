"use client";

import { createContext, useContext } from "react";
import NextLink from "next/link";

import type { Messages } from "./messages/en";
import { intlLocale, localePath, type Locale } from "./config";

interface I18nValue {
  locale: Locale;
  t: Messages;
  intl: string;
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: messages, intl: intlLocale[locale], href: (p) => localePath(locale, p) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}

/** next/link that prefixes internal paths with the active locale. */
export function Link({ href, ...props }: React.ComponentProps<typeof NextLink> & { href: string }) {
  const { href: localize } = useI18n();
  return <NextLink href={localize(href)} {...props} />;
}
