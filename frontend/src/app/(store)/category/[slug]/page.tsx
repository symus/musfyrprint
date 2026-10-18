import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { apiGet } from "@/lib/api/server";
import type { CategoryView } from "@/lib/api/types";

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await apiGet<CategoryView>(`/api/v1/catalog/categories/${encodeURIComponent(slug)}`);
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="skeleton mb-8 h-24" />}>
        <CategoryContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await apiGet<CategoryView>(`/api/v1/catalog/categories/${encodeURIComponent(slug)}`);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/shop" className="hover:underline">Shop</Link> /{" "}
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>
      <header className="mb-8 rounded-[2rem] p-8" style={{ background: `${category.accentHex ?? "#FFC23C"}26` }}>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-lg text-ink-soft">{category.description}</p>}
      </header>
      <CatalogBrowser
        pathname={`/category/${category.slug}`}
        searchParams={searchParams}
        fixed={{ category: category.slug }}
        hideFilters={{ family: true }}
      />
    </>
  );
}
