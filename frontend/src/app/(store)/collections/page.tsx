import type { Metadata } from "next";
import { Suspense } from "react";

import { CollectionCards } from "@/components/catalog/CollectionCards";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { apiGet } from "@/lib/api/server";
import type { CollectionView } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Collections",
  description: "Personalised gift collections, family matching outfits and business merchandise.",
};

export default function CollectionsPage() {
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">Collections</p>
      <h1 className="mb-8 text-4xl font-extrabold sm:text-5xl">Ideas for every occasion</h1>
      <Suspense fallback={<BlockSkeleton className="h-64" />}>
        <CollectionList />
      </Suspense>
    </div>
  );
}

async function CollectionList() {
  const collections = await apiGet<CollectionView[]>("/api/v1/catalog/collections");
  return <CollectionCards collections={collections} />;
}
