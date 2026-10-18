import type { Metadata } from "next";
import { Suspense, cache } from "react";

import { BusinessBanner } from "@/components/home/BusinessBanner";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PromoStrip } from "@/components/home/PromoStrip";
import { ReviewList } from "@/components/home/ReviewList";
import { CategoryTiles } from "@/components/catalog/CategoryTiles";
import { CollectionCards } from "@/components/catalog/CollectionCards";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { ProductGrid } from "@/components/product/ProductCard";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlockSkeleton, ProductGridSkeleton } from "@/components/ui/Skeletons";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { HomePage } from "@/lib/api/types";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { alternates: alternates(locale, "/") };
}

export default async function Home() {
  const { t } = await getI18n();
  return (
    <>
      <Suspense fallback={null}>
        <Promotions />
      </Suspense>
      <Hero />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeSections />
      </Suspense>
      <HowItWorks />
      <BusinessBanner />
      <section className="container-page py-16">
        <div className="card grid gap-6 bg-sun-soft p-8 md:grid-cols-2 md:items-center md:p-12">
          <div>
            <p className="eyebrow mb-2">{t.home.newsletterEyebrow}</p>
            <h2 className="text-3xl font-extrabold">{t.home.newsletterTitle}</h2>
            <p className="mt-2 text-ink-soft">{t.home.newsletterText}</p>
          </div>
          <NewsletterForm source="home" />
        </div>
      </section>
    </>
  );
}

// Deduplicated per request: the promo strip and the sections share one backend call.
const loadHome = cache(async (): Promise<HomePage | null> => {
  try {
    return await getLocalized<HomePage>("/api/v1/storefront/home");
  } catch {
    return null;
  }
});

async function Promotions() {
  const [home, { t }] = await Promise.all([loadHome(), getI18n()]);
  return home ? <PromoStrip promotions={home.promotions} useCode={t.promo.useCode} /> : null;
}

async function HomeSections() {
  const [home, { t }] = await Promise.all([loadHome(), getI18n()]);
  const h = t.home;
  if (!home) {
    return <div className="container-page py-10"><ErrorPanel message={h.unavailable} /></div>;
  }
  const viewAll = t.common.viewAll;
  return (
    <>
      <section className="container-page py-10" aria-label={h.categories}>
        <CategoryTiles categories={home.categories} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow={h.featuredEyebrow} title={h.featuredTitle} description={h.featuredText} href="/shop" linkLabel={viewAll} />
        <ProductGrid products={home.featured} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow={h.collectionsEyebrow} title={h.collectionsTitle} href="/collections" linkLabel={viewAll} />
        <CollectionCards collections={home.collections.slice(0, 3)} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow={h.trendingEyebrow} title={h.trendingTitle} href="/shop?sort=POPULAR" linkLabel={viewAll} />
        <ProductGrid products={home.trending.slice(0, 4)} />
      </section>
      {home.familyMatching.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow={h.familyEyebrow} title={h.familyTitle} description={h.familyText} href="/collections/family-matching" linkLabel={viewAll} />
          <ProductGrid products={home.familyMatching} />
        </section>
      )}
      {home.baby.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow={h.babyEyebrow} title={h.babyTitle} href="/category/baby" linkLabel={viewAll} />
          <ProductGrid products={home.baby} />
        </section>
      )}
      {home.reviews.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} />
          <ReviewList reviews={home.reviews} />
        </section>
      )}
      <section className="container-page py-10">
        <SectionHeading eyebrow={h.newEyebrow} title={h.newTitle} href="/shop?sort=NEWEST" linkLabel={viewAll} />
        <ProductGrid products={home.newArrivals.slice(0, 4)} />
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="container-page space-y-10 py-10">
      <BlockSkeleton className="h-40" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
