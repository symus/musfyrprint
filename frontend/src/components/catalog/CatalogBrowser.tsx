import { Suspense } from "react";

import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { ProductGrid } from "@/components/product/ProductCard";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { apiGet, query } from "@/lib/api/server";
import type { Facets, Page, ProductSummary } from "@/lib/api/types";
import { type SearchParams, toApiParams } from "@/lib/catalog-params";
import { ApiError } from "@/lib/api/errors";

/**
 * Listing + filters for /shop, categories, collections and offers. The fixed filter (e.g. category) comes
 * from the route; everything else from the URL.
 */
export function CatalogBrowser({ pathname, searchParams, fixed = {}, hideFilters }: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  fixed?: Record<string, string>;
  hideFilters?: Parameters<typeof FilterPanel>[0]["hide"];
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

async function Filters({ hide }: { hide?: Parameters<typeof FilterPanel>[0]["hide"] }) {
  const facets = await apiGet<Facets>("/api/v1/catalog/facets").catch(() => null);
  return facets ? <FilterPanel facets={facets} hide={hide} /> : null;
}

async function Results({ pathname, searchParams, fixed }: {
  pathname: string;
  searchParams: Promise<SearchParams>;
  fixed: Record<string, string>;
}) {
  const sp = await searchParams;
  const params = toApiParams(sp, fixed);
  let page: Page<ProductSummary>;
  try {
    page = await apiGet<Page<ProductSummary>>(`/api/v1/catalog/products${query(params)}`, { notFoundOn404: false });
  } catch (e) {
    const invalid = e instanceof ApiError && e.status === 400;
    return <ErrorPanel title={invalid ? "Some filters are not valid" : undefined} message={invalid ? "Please adjust or clear your filters." : undefined} />;
  }
  if (page.items.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-2xl font-bold">No products match</p>
        <p className="mt-2 text-ink-soft">Try removing a filter or searching for something else.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
        {page.totalItems} product{page.totalItems === 1 ? "" : "s"}
      </p>
      <ProductGrid products={page.items} />
      <Pagination pathname={pathname} searchParams={sp} page={page.page} totalPages={page.totalPages} />
    </div>
  );
}
