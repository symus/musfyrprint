import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgePercent } from "lucide-react";

import { ProductGrid } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { apiGet } from "@/lib/api/server";
import type { Page, ProductSummary, PromotionView } from "@/lib/api/types";
import { formatMinor } from "@/lib/format/money";

export const metadata: Metadata = { title: "Offers & discount codes" };

export default function OffersPage() {
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">Offers</p>
      <h1 className="mb-8 text-4xl font-extrabold sm:text-5xl">Current offers</h1>
      <Suspense fallback={<BlockSkeleton className="h-48" />}>
        <Offers />
      </Suspense>
    </div>
  );
}

function describe(p: PromotionView) {
  const min = p.minOrderMinor > 0 ? ` on orders over ${formatMinor(p.minOrderMinor, p.currency ?? undefined)}` : "";
  if (p.discountType === "PERCENT") return `${p.discountValue}% off${min}`;
  if (p.discountType === "FIXED") return `${formatMinor(p.discountValue, p.currency ?? undefined)} off${min}`;
  return `Free shipping${min}`;
}

async function Offers() {
  const [promotions, popular] = await Promise.all([
    apiGet<PromotionView[]>("/api/v1/promotions/active").catch(() => []),
    apiGet<Page<ProductSummary>>("/api/v1/catalog/products?sort=POPULAR&size=8").catch(() => null),
  ]);
  return (
    <>
      {promotions.length === 0 ? (
        <p className="card p-8 text-ink-soft">There are no public offers right now. Subscribe to our newsletter to hear about the next one.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {promotions.map((p) => (
            <li key={p.code ?? p.title} className="card flex gap-4 p-6">
              <BadgePercent className="shrink-0 text-coral" size={36} aria-hidden="true" />
              <div>
                <p className="font-display text-xl font-bold">{p.title}</p>
                <p className="text-ink-soft">{p.description ?? describe(p)}</p>
                {p.code && <p className="mt-3">Code: <code className="rounded bg-sun px-2 py-1 font-bold">{p.code}</code></p>}
                {p.endsAt && <p className="mt-2 text-xs text-ink-soft">Valid until {new Date(p.endsAt).toLocaleDateString()}</p>}
                <p className="mt-2 text-xs text-ink-soft">Codes are validated at checkout. One code per order.</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {popular && popular.items.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Popular picks to use them on" href="/shop?sort=POPULAR" />
          <ProductGrid products={popular.items} />
        </section>
      )}
    </>
  );
}
