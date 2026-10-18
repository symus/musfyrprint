import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product/ProductCard";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { ReviewList } from "@/components/home/ReviewList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlockSkeleton, ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Stars } from "@/components/ui/Stars";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/client";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { ProductDetail, ProductSummary, ReviewView } from "@/lib/api/types";
import { ageGroupLabel, fitLabel, genderLabel } from "@/lib/format/labels";

const productPath = (slug: string) => `/api/v1/catalog/products/${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()]);
  const p = await getLocalized<ProductDetail>(productPath(slug));
  return {
    title: p.name,
    description: p.shortDescription ?? undefined,
    alternates: alternates(locale, `/products/${p.slug}`),
    openGraph: { title: p.name, description: p.shortDescription ?? undefined, type: "website" },
  };
}

export default function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<BlockSkeleton className="h-[32rem]" />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/[locale]/products/[slug]">["params"] }) {
  const [{ slug }, { t }] = await Promise.all([params, getI18n()]);
  const product = await getLocalized<ProductDetail>(productPath(slug));
  const p = t.product;
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
      availability: product.variants.some((v) => v.availability !== "OUT_OF_STOCK") ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label={t.nav.breadcrumb} className="mb-6 text-sm text-ink-soft">
        <Link href="/" className="hover:underline">{t.nav.home}</Link>
        {product.breadcrumbs.map((b) => (
          <span key={b.slug}> / <Link href={`/category/${b.slug}`} className="hover:underline">{b.name}</Link></span>
        ))}
        {" / "}<span aria-current="page" className="text-ink">{product.name}</span>
      </nav>

      {product.ratingCount > 0 && <div className="mb-2"><Stars rating={product.ratingAvg} count={product.ratingCount} size="md" /></div>}
      <ProductConfigurator product={product} />

      <section className="mt-16 grid gap-8 lg:grid-cols-2" aria-labelledby="details-heading">
        <div>
          <h2 id="details-heading" className="mb-4 text-2xl font-extrabold">{p.details}</h2>
          {product.description && <p className="text-ink-soft">{product.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {product.material && (<><dt className="font-bold">{p.material}</dt><dd>{product.material}</dd></>)}
            {product.fit !== "NA" && (<><dt className="font-bold">{t.catalog.fit}</dt><dd>{fitLabel(t, product.fit)}</dd></>)}
            {product.gender !== "NA" && (<><dt className="font-bold">{t.catalog.cut}</dt><dd>{genderLabel(t, product.gender)}</dd></>)}
            {product.ageGroup !== "NA" && (<><dt className="font-bold">{t.catalog.ageGroup}</dt><dd>{ageGroupLabel(t, product.ageGroup)}</dd></>)}
          </dl>
        </div>
        {product.printAreas.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-extrabold">{p.printAreas}</h2>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{p.printAreasCaption}</caption>
              <thead className="border-b border-line text-ink-soft">
                <tr><th className="py-2">{p.location}</th><th>{p.maxSize}</th><th>{p.minResolution}</th></tr>
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
            <p className="mt-3 text-xs text-ink-soft">{p.colourNote}</p>
          </div>
        )}
      </section>

      <Suspense fallback={null}>
        <Reviews slug={product.slug} title={p.reviews} />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Related slug={product.slug} title={p.related} />
      </Suspense>
    </>
  );
}

async function Reviews({ slug, title }: { slug: string; title: string }) {
  const reviews = await getLocalized<ReviewView[]>(`${productPath(slug)}/reviews`).catch(() => []);
  if (reviews.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeading title={title} />
      <ReviewList reviews={reviews} />
    </section>
  );
}

async function Related({ slug, title }: { slug: string; title: string }) {
  const related = await getLocalized<ProductSummary[]>(`${productPath(slug)}/related?size=4`).catch(() => []);
  if (related.length === 0) return null;
  return (
    <section className="mt-16">
      <SectionHeading title={title} />
      <ProductGrid products={related} />
    </section>
  );
}
