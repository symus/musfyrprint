import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { apiGet } from "@/lib/api/server";
import type { CollectionView } from "@/lib/api/types";

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiGet<CollectionView>(`/api/v1/catalog/collections/${encodeURIComponent(slug)}`);
  return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` } };
}

export default function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="skeleton mb-8 h-24" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const c = await apiGet<CollectionView>(`/api/v1/catalog/collections/${encodeURIComponent(slug)}`);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/collections" className="hover:underline">Collections</Link> /{" "}
        <span aria-current="page" className="text-ink">{c.name}</span>
      </nav>
      <header className="mb-8 rounded-[2rem] border-2 border-ink p-8" style={{ background: `${c.accentHex ?? "#FFC23C"}22` }}>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{c.name}</h1>
        {c.description && <p className="mt-2 max-w-2xl text-lg text-ink-soft">{c.description}</p>}
        {c.kind === "BUSINESS" && (
          <Link href="/custom-orders" className="btn btn-primary mt-6">Request a bulk quote</Link>
        )}
      </header>
      <CatalogBrowser pathname={`/collections/${c.slug}`} searchParams={searchParams} fixed={{ collection: c.slug }} />
    </>
  );
}
