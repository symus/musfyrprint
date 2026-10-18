import type { Metadata } from "next";
import { Suspense } from "react";
import { Layers, Rotate3d, Type, Upload } from "lucide-react";

import { ProductGrid } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Link } from "@/i18n/client";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { Page, ProductSummary } from "@/lib/api/types";

const ICONS = [Type, Upload, Layers, Rotate3d];

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.design.eyebrow, description: t.design.metaDescription, alternates: alternates(locale, "/design") };
}

/**
 * Entry point of the design studio. The interactive editor (canvas + 3D preview) ships in Phase 2; until then
 * this page says so plainly and lets customers pick a product.
 */
export default async function DesignPage() {
  const { t } = await getI18n();
  const d = t.design;
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">{d.eyebrow}</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">{d.title}</h1>
      <div role="status" className="mt-6 rounded-2xl border-2 border-dashed border-violet bg-violet-soft p-5">
        <p className="font-bold">{d.noticeTitle}</p>
        <p className="mt-1 text-ink-soft">
          {d.noticeText} <Link className="font-semibold underline" href="/custom-orders">{d.noticeLink}</Link>.
        </p>
      </div>
      <ul className="my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.features.map((f, i) => {
          const Icon = ICONS[i];
          return (
            <li key={f.title} className="card p-5">
              <Icon className="text-coral" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-bold">{f.title}</p>
              <p className="text-sm text-ink-soft">{f.text}</p>
            </li>
          );
        })}
      </ul>
      <SectionHeading title={d.choose} />
      <Suspense fallback={<ProductGridSkeleton />}>
        <Customisable />
      </Suspense>
    </div>
  );
}

async function Customisable() {
  const page = await getLocalized<Page<ProductSummary>>("/api/v1/catalog/products?customizable=true&size=60").catch(() => null);
  return page ? <ProductGrid products={page.items} /> : null;
}
