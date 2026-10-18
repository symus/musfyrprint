import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Link } from "@/i18n/client";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { CategoryView } from "@/lib/api/types";

const load = (slug: string) => getLocalized<CategoryView>(`/api/v1/catalog/categories/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: PageProps<"/[locale]/category/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()]);
  const category = await load(slug);
  return { title: category.name, description: category.description ?? undefined, alternates: alternates(locale, `/category/${category.slug}`) };
}

export default function CategoryPage({ params, searchParams }: PageProps<"/[locale]/category/[slug]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="skeleton mb-8 h-24" />}>
        <CategoryContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/[locale]/category/[slug]">) {
  const [{ slug }, { t }] = await Promise.all([params, getI18n()]);
  const category = await load(slug);
  return (
    <>
      <nav aria-label={t.nav.breadcrumb} className="mb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">{t.nav.home}</Link> / <Link href="/shop" className="hover:underline">{t.nav.shop}</Link> /{" "}
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>
      <header className="mb-8 rounded-[2rem] p-8" style={{ background: `${category.accentHex ?? "#FFC23C"}26` }}>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-lg text-ink-soft">{category.description}</p>}
      </header>
      <CatalogBrowser pathname={`/category/${category.slug}`} searchParams={searchParams} fixed={{ category: category.slug }} hideFilters={{ family: true }} />
    </>
  );
}
