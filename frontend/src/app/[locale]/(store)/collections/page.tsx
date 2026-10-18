import type { Metadata } from "next";
import { Suspense } from "react";

import { CollectionCards } from "@/components/catalog/CollectionCards";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { CollectionView } from "@/lib/api/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.collections.eyebrow, description: t.collections.description, alternates: alternates(locale, "/collections") };
}

export default async function CollectionsPage() {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">{t.collections.eyebrow}</p>
      <h1 className="mb-8 text-4xl font-extrabold sm:text-5xl">{t.collections.title}</h1>
      <Suspense fallback={<BlockSkeleton className="h-64" />}>
        <CollectionList />
      </Suspense>
    </div>
  );
}

async function CollectionList() {
  const collections = await getLocalized<CollectionView[]>("/api/v1/catalog/collections");
  return <CollectionCards collections={collections} />;
}
