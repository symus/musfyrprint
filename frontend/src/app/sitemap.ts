import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";
import { PAGES } from "@/content/pages";
import { apiGet } from "@/lib/api/server";
import type { CategoryView, CollectionView, Page, ProductSummary } from "@/lib/api/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${brand.siteUrl}${path}`;
  const staticPaths = ["/", "/shop", "/collections", "/offers", "/custom-orders", "/design", ...Object.keys(PAGES).map((s) => `/help/${s}`)];
  const [categories, collections, products] = await Promise.all([
    apiGet<CategoryView[]>("/api/v1/catalog/categories").catch(() => []),
    apiGet<CollectionView[]>("/api/v1/catalog/collections").catch(() => []),
    apiGet<Page<ProductSummary>>("/api/v1/catalog/products?size=60").catch(() => null),
  ]);
  // TODO(scale): page through products (or expose a dedicated sitemap endpoint) once the catalogue exceeds 60 items.
  return [
    ...staticPaths.map((p) => ({ url: url(p) })),
    ...categories.map((c) => ({ url: url(`/category/${c.slug}`) })),
    ...collections.map((c) => ({ url: url(`/collections/${c.slug}`) })),
    ...(products?.items ?? []).map((p) => ({ url: url(`/products/${p.slug}`) })),
  ];
}
