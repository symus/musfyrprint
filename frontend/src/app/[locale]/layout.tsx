import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "../globals.css";

import { brand } from "@/config/brand";
import { locales } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    metadataBase: new URL(brand.siteUrl),
    title: { default: `${brand.name} – ${t.meta.title}`, template: `%s · ${brand.name}` },
    description: t.meta.description,
    applicationName: brand.name,
    openGraph: { siteName: brand.name, type: "website", locale: locale === "pl" ? "pl_PL" : "en_GB" },
    alternates: { languages: { pl: "/pl", en: "/en", "x-default": "/pl" } },
  };
}

export const viewport: Viewport = { themeColor: "#FFFBF4", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={t}>{children}</I18nProvider>
      </body>
    </html>
  );
}
