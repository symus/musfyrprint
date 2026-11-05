import type { Metadata } from "next";
import { Suspense } from "react";

import { StudioLoader } from "@/components/studio/StudioLoader";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { ProductDetail } from "@/lib/api/types";

const productPath = (slug: string) => `/api/v1/catalog/products/${encodeURIComponent(slug)}`;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function generateMetadata({ params }: PageProps<"/[locale]/design/[slug]">): Promise<Metadata> {
  const [{ slug }, { t, locale }] = await Promise.all([params, getI18n()]);
  const p = await getLocalized<ProductDetail>(productPath(slug));
  return { title: `${t.studio.title} · ${p.name}`, robots: { index: false }, alternates: alternates(locale, `/design/${slug}`) };
}

export default function StudioPage({ params, searchParams }: PageProps<"/[locale]/design/[slug]">) {
  return (
    <div className="container-page max-w-[96rem] py-6">
      <Suspense fallback={<BlockSkeleton className="h-[40rem]" />}>
        <Studio params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Studio({ params, searchParams }: PageProps<"/[locale]/design/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getLocalized<ProductDetail>(productPath(slug));
  return (
    <StudioLoader product={product} initialColor={first(sp.color)} initialSize={first(sp.size)} designId={first(sp.design)} />
  );
}
