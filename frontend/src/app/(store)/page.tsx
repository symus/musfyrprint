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
import { apiGet } from "@/lib/api/server";
import type { HomePage } from "@/lib/api/types";

export default function Home() {
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
            <p className="eyebrow mb-2">Stay in the loop</p>
            <h2 className="text-3xl font-extrabold">Fresh templates & seasonal drops</h2>
            <p className="mt-2 text-ink-soft">One friendly e-mail a month. No spam, unsubscribe anytime.</p>
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
    return await apiGet<HomePage>("/api/v1/storefront/home");
  } catch {
    return null;
  }
});

async function Promotions() {
  const home = await loadHome();
  return home ? <PromoStrip promotions={home.promotions} /> : null;
}

async function HomeSections() {
  const home = await loadHome();
  if (!home) {
    return (
      <div className="container-page py-10">
        <ErrorPanel message="Our product catalogue is temporarily unavailable. Please try again in a moment." />
      </div>
    );
  }
  return (
    <>
      <section className="container-page py-10" aria-label="Categories">
        <CategoryTiles categories={home.categories} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow="Featured" title="Ready for your design" description="Our favourite blanks, chosen for print quality and comfort." href="/shop" />
        <ProductGrid products={home.featured} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow="Collections" title="Gifts, families & teams" href="/collections" />
        <CollectionCards collections={home.collections.slice(0, 3)} />
      </section>
      <section className="container-page py-10">
        <SectionHeading eyebrow="Trending" title="Most loved right now" href="/shop?sort=POPULAR" />
        <ProductGrid products={home.trending.slice(0, 4)} />
      </section>
      {home.familyMatching.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow="Family matching" title="Matching outfits for the whole crew" description="Same design, sizes from newborn to 3XL." href="/collections/family-matching" />
          <ProductGrid products={home.familyMatching} />
        </section>
      )}
      {home.baby.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow="Baby & newborn" title="Tiny tees, big announcements" href="/category/baby" />
          <ProductGrid products={home.baby} />
        </section>
      )}
      {home.reviews.length > 0 && (
        <section className="container-page py-10">
          <SectionHeading eyebrow="Reviews" title="What customers say" />
          <ReviewList reviews={home.reviews} />
        </section>
      )}
      <section className="container-page py-10">
        <SectionHeading eyebrow="New arrivals" title="Just landed" href="/shop?sort=NEWEST" />
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
