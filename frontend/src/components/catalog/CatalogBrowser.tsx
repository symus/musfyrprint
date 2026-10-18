import { Suspense } from "react";

import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { ProductGrid } from "@/components/product/ProductCard";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { getI18n } from "@/i18n/server";
import { plural } from "@/i18n/format";
import { ApiError } from "@/lib/api/errors";
import { getLocalized } from "@/lib/api/localized";
import { query } from "@/lib/api/server";
import type { Facets, Page, ProductSummary } from "@/lib/api/types";
import { type SearchParams, toApiParams } from "@/lib/catalog-params";

type Hidden = Parameters<typeof FilterPanel>[0]["hide"];

/**
 * Listing + filters for /shop, categories and collections. The fixed filter (e.g. category) comes from the
 * route; everything else from the URL. `pathname` is locale-independent (e.g. "/shop").
 */
export function CatalogBrowser({ pathname, searchParams, fixed = {}, hideFilters }: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  fixed?: Record<string, string>;
  hideFilters?: Hidden;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <div>
        <Suspense fallback={<div className="skeleton h-64" />}>
          <Filters hide={hideFilters} />
        </Suspense>
      </div>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results pathname={pathname} searchParams={searchParams} fixed={fixed} />
      </Suspense>
    </div>
  );
}

async function Filters({ hide }: { hide?: Hidden }) {
  const facets = await getLocalized<Facets>("/api/v1/catalog/facets").catch(() => null);
  return facets ? <FilterPanel facets={facets} hide={hide} /> : null;
}

async function Results({ pathname, searchParams, fixed }: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  fixed: Record<string, string>;
}) {
  const [{ t, intl }, sp] = await Promise.all([getI18n(), searchParams]);
  let page: Page<ProductSummary>;
  try {
    page = await getLocalized<Page<ProductSummary>>(`/api/v1/catalog/products${query(toApiParams(sp, fixed))}`, { notFoundOn404: false });
  } catch (e) {
    const invalid = e instanceof ApiError && e.status === 400;
    return invalid ? <ErrorPanel title={t.catalog.invalidTitle} message={t.catalog.invalidText} /> : <ErrorPanel />;
  }
  if (page.items.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-2xl font-bold">{t.catalog.noMatchTitle}</p>
        <p className="mt-2 text-ink-soft">{t.catalog.noMatchText}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft" aria-live="polite">{plural(intl, page.totalItems, t.common.products)}</p>
      <ProductGrid products={page.items} />
      <Pagination pathname={pathname} searchParams={sp} page={page.page} totalPages={page.totalPages} label={t.catalog.pagination} />
    </div>
  );
}
