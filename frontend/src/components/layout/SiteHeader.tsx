import Link from "next/link";
import { Suspense } from "react";
import { Palette } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { apiGet } from "@/lib/api/server";
import type { CategoryView } from "@/lib/api/types";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

const STATIC_LINKS = [
  { href: "/collections", label: "Collections" },
  { href: "/offers", label: "Offers" },
  { href: "/custom-orders", label: "Business & bulk" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" aria-label="Home" className="shrink-0">
          <Logo />
        </Link>
        <Suspense fallback={<nav className="hidden flex-1 xl:block" aria-label="Main" />}>
          <CategoryNav />
        </Suspense>
        <SearchBox className="ml-auto hidden w-64 md:block" />
        <Link href="/design" className="btn btn-primary hidden whitespace-nowrap !py-2 sm:inline-flex">
          <Palette size={18} aria-hidden="true" /> Design your own
        </Link>
        <Suspense fallback={<MobileMenu links={STATIC_LINKS} />}>
          <MobileNav />
        </Suspense>
      </div>
    </header>
  );
}

async function topCategories() {
  try {
    const categories = await apiGet<CategoryView[]>("/api/v1/catalog/categories");
    return categories.filter((c) => !c.parentSlug && c.productCount > 0);
  } catch {
    return [];
  }
}

async function CategoryNav() {
  const categories = await topCategories();
  return (
    <nav aria-label="Main" className="hidden flex-1 xl:block">
      <ul className="flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/category/${c.slug}`} className="rounded-full px-2.5 py-2 hover:bg-cloud">
              {c.name}
            </Link>
          </li>
        ))}
        {STATIC_LINKS.slice(1, 2).map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="rounded-full px-2.5 py-2 hover:bg-cloud">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function MobileNav() {
  const categories = await topCategories();
  return (
    <MobileMenu
      links={[
        { href: "/design", label: "Design your own" },
        { href: "/shop", label: "Shop all" },
        ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
        ...STATIC_LINKS,
      ]}
    />
  );
}
