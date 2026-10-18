"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { LOCALE_COOKIE, localeNames, locales, type Locale } from "@/i18n/config";

function rememberLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** Switches language on the same page; the choice is remembered in a cookie for future visits. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = (next: Locale) => {
    const rest = pathname.replace(/^\/(pl|en)(?=\/|$)/, "");
    return `/${next}${rest}${search ? `?${search}` : ""}`;
  };
  return (
    <nav aria-label={t.nav.language} className={`flex items-center gap-1 text-sm font-semibold ${className}`}>
      <Globe size={16} aria-hidden="true" className="text-ink-soft" />
      {locales.map((l) => (
        <NextLink
          key={l}
          href={target(l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          title={localeNames[l]}
          onClick={() => rememberLocale(l)}
          className={`rounded-full px-2 py-1 uppercase ${l === locale ? "bg-ink text-paper" : "hover:bg-cloud"}`}
        >
          {l}
        </NextLink>
      ))}
    </nav>
  );
}

/** Static fallback rendered while the URL-dependent switcher streams in. */
export function LanguageSwitcherFallback({ locale }: { locale: Locale }) {
  return (
    <nav aria-label="Language" className="flex items-center gap-1 text-sm font-semibold">
      <Globe size={16} aria-hidden="true" className="text-ink-soft" />
      {locales.map((l) => (
        <NextLink key={l} href={`/${l}`} hrefLang={l} className={`rounded-full px-2 py-1 uppercase ${l === locale ? "bg-ink text-paper" : ""}`}>
          {l}
        </NextLink>
      ))}
    </nav>
  );
}
