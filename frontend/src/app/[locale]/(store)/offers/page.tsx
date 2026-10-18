import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgePercent } from "lucide-react";

import { ProductGrid } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import type { Messages } from "@/i18n/messages/en";
import { fmt } from "@/i18n/format";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { Page, ProductSummary, PromotionView } from "@/lib/api/types";
import { formatMinor } from "@/lib/format/money";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.offers.metaTitle, alternates: alternates(locale, "/offers") };
}

export default async function OffersPage() {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">{t.offers.eyebrow}</p>
      <h1 className="mb-8 text-4xl font-extrabold sm:text-5xl">{t.offers.title}</h1>
      <Suspense fallback={<BlockSkeleton className="h-48" />}>
        <Offers />
      </Suspense>
    </div>
  );
}

function describe(p: PromotionView, o: Messages["offers"], intl: string) {
  const currency = p.currency ?? "PLN";
  const min = p.minOrderMinor > 0 ? fmt(o.onOrdersOver, { value: formatMinor(p.minOrderMinor, currency, intl) }) : "";
  if (p.discountType === "PERCENT") return fmt(o.percentOff, { value: p.discountValue }) + min;
  if (p.discountType === "FIXED") return fmt(o.fixedOff, { value: formatMinor(p.discountValue, currency, intl) }) + min;
  return o.freeShipping + min;
}

async function Offers() {
  const [{ t, intl }, promotions, popular] = await Promise.all([
    getI18n(),
    getLocalized<PromotionView[]>("/api/v1/promotions/active").catch(() => []),
    getLocalized<Page<ProductSummary>>("/api/v1/catalog/products?sort=POPULAR&size=8").catch(() => null),
  ]);
  const o = t.offers;
  return (
    <>
      {promotions.length === 0 ? (
        <p className="card p-8 text-ink-soft">{o.none}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {promotions.map((p) => (
            <li key={p.code ?? p.title} className="card flex gap-4 p-6">
              <BadgePercent className="shrink-0 text-coral" size={36} aria-hidden="true" />
              <div>
                <p className="font-display text-xl font-bold">{p.title}</p>
                <p className="text-ink-soft">{p.description ?? describe(p, o, intl)}</p>
                {p.code && <p className="mt-3">{o.code}: <code className="rounded bg-sun px-2 py-1 font-bold">{p.code}</code></p>}
                {p.endsAt && <p className="mt-2 text-xs text-ink-soft">{fmt(o.validUntil, { date: new Date(p.endsAt).toLocaleDateString(intl) })}</p>}
                <p className="mt-2 text-xs text-ink-soft">{o.codesNote}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {popular && popular.items.length > 0 && (
        <section className="mt-14">
          <SectionHeading title={o.popular} href="/shop?sort=POPULAR" linkLabel={t.common.viewAll} />
          <ProductGrid products={popular.items} />
        </section>
      )}
    </>
  );
}
