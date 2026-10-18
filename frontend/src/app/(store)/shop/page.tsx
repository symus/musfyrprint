import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse customisable T-shirts, hoodies, baby clothing, kids' wear, totes and stickers.",
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="container-page py-10">
      <h1 className="mb-2 text-4xl font-extrabold sm:text-5xl">Shop all</h1>
      <Suspense fallback={<p className="mb-8 text-ink-soft">Everything you can personalise.</p>}>
        <SearchSummary searchParams={searchParams} />
      </Suspense>
      <CatalogBrowser pathname="/shop" searchParams={searchParams} />
    </div>
  );
}

async function SearchSummary({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return <p className="mb-8 text-ink-soft">{q ? <>Results for “<strong className="text-ink">{q}</strong>”</> : "Everything you can personalise."}</p>;
}
