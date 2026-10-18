import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product/ProductCard";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { ReviewList } from "@/components/home/ReviewList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlockSkeleton, ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Stars } from "@/components/ui/Stars";
import { brand } from "@/config/brand";
import { apiGet } from "@/lib/api/server";
import type { ProductDetail, ProductSummary, ReviewView } from "@/lib/api/types";
import { ageGroupLabel, fitLabel, genderLabel } from "@/lib/format/labels";

const productPath = (slug: string) => `/api/v1/catalog/products/${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await apiGet<ProductDetail>(productPath(slug));
  return {
    title: p.name,
    description: p.shortDescription ?? undefined,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: p.shortDescription ?? undefined, type: "website" },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<BlockSkeleton className="h-[32rem]" />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await apiGet<ProductDetail>(productPath(slug));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: brand.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: product.priceFrom.currency,
      lowPrice: (product.priceFrom.amountMinor / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.availability !== "OUT_OF_STOCK")
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">Home</Link>
        {product.breadcrumbs.map((b) => (
          <span key={b.slug}> / <Link href={`/category/${b.slug}`} className="hover:underline">{b.name}</Link></span>
        ))}
        {" / "}<span aria-current="page" className="text-ink">{product.name}</span>
      </nav>

      {product.ratingCount > 0 && (
        <div className="mb-2"><Stars rating={product.ratingAvg} count={product.ratingCount} size="md" /></div>
      )}
      <ProductConfigurator product={product} />

      <section className="mt-16 grid gap-8 lg:grid-cols-2" aria-labelledby="details-heading">
        <div>
          <h2 id="details-heading" className="mb-4 text-2xl font-extrabold">Product details</h2>
          {product.description && <p className="text-ink-soft">{product.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {product.material && (<><dt className="font-bold">Material</dt><dd>{product.material}</dd></>)}
            {product.fit !== "NA" && (<><dt className="font-bold">Fit</dt><dd>{fitLabel(product.fit)}</dd></>)}
            {product.gender !== "NA" && (<><dt className="font-bold">Cut</dt><dd>{genderLabel(product.gender)}</dd></>)}
            {product.ageGroup !== "NA" && (<><dt className="font-bold">Age group</dt><dd>{ageGroupLabel(product.ageGroup)}</dd></>)}
          </dl>
        </div>
        {product.printAreas.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-extrabold">Print areas</h2>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Printable areas and their maximum sizes</caption>
              <thead className="border-b border-line text-ink-soft">
                <tr><th className="py-2">Location</th><th>Max. size</th><th>Min. resolution</th></tr>
              </thead>
              <tbody>
                {product.printAreas.map((a) => (
                  <tr key={a.code} className="border-b border-line/60">
                    <td className="py-2 font-semibold">{a.name}</td>
                    <td>{a.widthMm / 10} × {a.heightMm / 10} cm</td>
                    <td>{a.minDpi} DPI</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-ink-soft">
              On-screen colours are approximate; fabric texture and print method affect the final result.
            </p>
          </div>
        )}
      </section>

      <Suspense fallback={null}>
        <Reviews slug={product.slug} />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Related slug={product.slug} />
      </Suspense>
    </>
  );
}

async function Reviews({ slug }: { slug: string }) {
  const reviews = await apiGet<ReviewView[]>(`${productPath(slug)}/reviews`).catch(() => []);
  if (reviews.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeading title="Customer reviews" />
      <ReviewList reviews={reviews} />
    </section>
  );
}

async function Related({ slug }: { slug: string }) {
  const related = await apiGet<ProductSummary[]>(`${productPath(slug)}/related?size=4`).catch(() => []);
  if (related.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeading title="You might also like" />
      <ProductGrid products={related} />
    </section>
  );
}
