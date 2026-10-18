import type { Metadata } from "next";
import { Suspense } from "react";
import { Building2, GraduationCap, PartyPopper, Trophy } from "lucide-react";

import { QuoteForm } from "@/components/forms/QuoteForm";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { alternates, getI18n } from "@/i18n/server";
import { getLocalized } from "@/lib/api/localized";
import type { Page, ProductSummary } from "@/lib/api/types";

const ICONS = [Building2, GraduationCap, Trophy, PartyPopper];

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.quote.metaTitle, description: t.quote.intro, alternates: alternates(locale, "/custom-orders") };
}

export default async function CustomOrdersPage() {
  const { t } = await getI18n();
  const q = t.quote;
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">{q.eyebrow}</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">{q.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">{q.intro}</p>
      <ul className="my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {q.uses.map((u, i) => {
          const Icon = ICONS[i];
          return (
            <li key={u.title} className="card p-5">
              <Icon className="text-violet" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-bold">{u.title}</p>
              <p className="text-sm text-ink-soft">{u.text}</p>
            </li>
          );
        })}
      </ul>
      <Suspense fallback={<BlockSkeleton className="h-96" />}>
        <FormWithProducts />
      </Suspense>
    </div>
  );
}

async function FormWithProducts() {
  const page = await getLocalized<Page<ProductSummary>>("/api/v1/catalog/products?size=60&sort=POPULAR").catch(() => null);
  return <QuoteForm productOptions={page?.items.map((p) => p.name) ?? []} />;
}
