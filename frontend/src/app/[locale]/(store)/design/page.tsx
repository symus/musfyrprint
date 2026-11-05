import type { Metadata } from "next";
import { Suspense } from "react";
import { Layers, Rotate3d, Type, Upload } from "lucide-react";

import { GarmentArt } from "@/components/product/GarmentArt";
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
 * Entry point of the design studio: pick a product, then design it at /design/[slug].
 */
export default async function DesignPage() {
  const { t } = await getI18n();
  const d = t.design;
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">{d.eyebrow}</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">{d.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        {d.intro} <Link className="font-semibold underline" href="/custom-orders">{d.noticeLink}</Link>.
      </p>
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
  const [page, { t }] = await Promise.all([
    getLocalized<Page<ProductSummary>>("/api/v1/catalog/products?customizable=true&size=60").catch(() => null),
    getI18n(),
  ]);
  if (!page) return null;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {page.items.map((p, i) => (
        <li key={p.id}>
          <Link href={`/design/${p.slug}`} className="group card flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
            <span className={`aspect-square p-6 ${["bg-sun-soft", "bg-violet-soft", "bg-mint-soft", "bg-cloud"][i % 4]}`}>
              <GarmentArt garmentType={p.garmentType} colorHex={p.colors[0]?.hex} printText={t.art.yourIdea} className="h-full w-full" title={p.name} />
            </span>
            <span className="p-4">
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">{p.categoryName}</span>
              <span className="mt-1 block font-display text-lg font-bold leading-tight">{p.name}</span>
              <span className="mt-2 inline-block text-sm font-semibold text-violet">{t.design.start} →</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
