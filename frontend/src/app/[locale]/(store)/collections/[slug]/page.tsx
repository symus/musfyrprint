import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Link } from "@/i18n/client";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { CollectionView } from "@/lib/api/types";

const load = (slug: string) => getLocalized<CollectionView>(`/api/v1/catalog/collections/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()]);
  const c = await load(slug);
  return { title: c.name, description: c.description ?? undefined, alternates: alternates(locale, `/collections/${c.slug}`) };
}

export default function CollectionPage({ params, searchParams }: PageProps<"/[locale]/collections/[slug]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="skeleton mb-8 h-24" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ params, searchParams }: PageProps<"/[locale]/collections/[slug]">) {
  const [{ slug }, { t }] = await Promise.all([params, getI18n()]);
  const c = await load(slug);
  return (
    <>
      <nav aria-label={t.nav.breadcrumb} className="mb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">{t.nav.home}</Link> / <Link href="/collections" className="hover:underline">{t.nav.collections}</Link> /{" "}
        <span aria-current="page" className="text-ink">{c.name}</span>
      </nav>
      <header className="mb-8 rounded-[2rem] border-2 border-ink p-8" style={{ background: `${c.accentHex ?? "#FFC23C"}22` }}>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{c.name}</h1>
        {c.description && <p className="mt-2 max-w-2xl text-lg text-ink-soft">{c.description}</p>}
        {c.kind === "BUSINESS" && <Link href="/custom-orders" className="btn btn-primary mt-6">{t.collections.requestBulk}</Link>}
      </header>
      <CatalogBrowser pathname={`/collections/${c.slug}`} searchParams={searchParams} fixed={{ collection: c.slug }} />
    </>
  );
}
