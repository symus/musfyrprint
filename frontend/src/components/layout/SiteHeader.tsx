import { Suspense } from "react";
import { Palette } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { CategoryView } from "@/lib/api/types";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

export async function SiteHeader() {
  const { t, locale } = await getI18n();
  const staticLinks = [
    { href: "/collections", label: t.nav.collections },
    { href: "/offers", label: t.nav.offers },
    { href: "/custom-orders", label: t.nav.business },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        {t.nav.skip}
      </a>
      <div className="container-page flex h-16 items-center gap-3">
        <Link href="/" aria-label={t.nav.home} className="shrink-0"><Logo /></Link>
        <Suspense fallback={<nav className="hidden flex-1 xl:block" aria-label={t.nav.main} />}>
          <CategoryNav extra={staticLinks.slice(1, 2)} label={t.nav.main} />
        </Suspense>
        <SearchBox className="ml-auto hidden w-56 md:block" />
        <Suspense fallback={<LanguageSwitcherFallback locale={locale} />}>
          <LanguageSwitcher />
        </Suspense>
        <Link href="/design" className="btn btn-primary hidden whitespace-nowrap !py-2 sm:inline-flex">
          <Palette size={18} aria-hidden="true" /> {t.nav.design}
        </Link>
        <Suspense fallback={<MobileMenu links={staticLinks} />}>
          <MobileNav staticLinks={staticLinks} />
        </Suspense>
      </div>
    </header>
  );
}

async function topCategories() {
  try {
    const categories = await getLocalized<CategoryView[]>("/api/v1/catalog/categories");
    return categories.filter((c) => !c.parentSlug && c.productCount > 0);
  } catch {
    return [];
  }
}

async function CategoryNav({ extra, label }: { extra: { href: string; label: string }[]; label: string }) {
  const categories = await topCategories();
  return (
    <nav aria-label={label} className="hidden flex-1 xl:block">
      <ul className="flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold">
        {[...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })), ...extra].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="rounded-full px-2.5 py-2 hover:bg-cloud">{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function MobileNav({ staticLinks }: { staticLinks: { href: string; label: string }[] }) {
  const [{ t }, categories] = await Promise.all([getI18n(), topCategories()]);
  return (
    <MobileMenu
      links={[
        { href: "/design", label: t.nav.design },
        { href: "/shop", label: t.nav.shopAll },
        ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
        ...staticLinks,
      ]}
    />
  );
}
