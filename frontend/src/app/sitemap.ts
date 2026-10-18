import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";
import { PAGE_SLUGS } from "@/content/pages";
import { locales } from "@/i18n/config";
import { apiGet } from "@/lib/api/server";
import type { CategoryView, CollectionView, Page, ProductSummary } from "@/lib/api/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, products] = await Promise.all([
    apiGet<CategoryView[]>("/api/v1/catalog/categories").catch(() => []),
    apiGet<CollectionView[]>("/api/v1/catalog/collections").catch(() => []),
    apiGet<Page<ProductSummary>>("/api/v1/catalog/products?size=60").catch(() => null),
  ]);
  // TODO(scale): page through products (or expose a dedicated sitemap endpoint) once the catalogue exceeds 60 items.
  const paths = [
    "/", "/shop", "/collections", "/offers", "/custom-orders", "/design",
    ...PAGE_SLUGS.map((s) => `/help/${s}`),
    ...categories.map((c) => `/category/${c.slug}`),
    ...collections.map((c) => `/collections/${c.slug}`),
    ...(products?.items ?? []).map((p) => `/products/${p.slug}`),
  ];
  const url = (locale: string, path: string) => `${brand.siteUrl}/${locale}${path === "/" ? "" : path}`;
  return paths.map((path) => ({
    url: url("pl", path),
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, url(l, path)])) },
  }));
}
