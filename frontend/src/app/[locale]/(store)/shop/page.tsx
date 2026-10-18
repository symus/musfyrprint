import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { SearchBox } from "@/components/layout/SearchBox";
import { alternates, getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.catalog.shopTitle, description: t.catalog.shopIntro, alternates: alternates(locale, "/shop") };
}

export default async function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      <h1 className="mb-2 text-4xl font-extrabold sm:text-5xl">{t.catalog.shopTitle}</h1>
      <Suspense fallback={<p className="mb-8 text-ink-soft">{t.catalog.shopIntro}</p>}>
        <SearchSummary searchParams={searchParams} />
      </Suspense>
      <SearchBox className="mb-8 max-w-xl" />
      <CatalogBrowser pathname="/shop" searchParams={searchParams} />
    </div>
  );
}

async function SearchSummary({ searchParams }: { searchParams: PageProps<"/[locale]/shop">["searchParams"] }) {
  const [{ t }, sp] = await Promise.all([getI18n(), searchParams]);
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (
    <p className="mb-8 text-ink-soft">
      {q ? <>{t.catalog.resultsFor} „<strong className="text-ink">{q}</strong>”</> : t.catalog.shopIntro}
    </p>
  );
}
