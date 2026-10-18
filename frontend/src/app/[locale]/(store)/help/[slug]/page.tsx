import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { getPages, PAGE_SLUGS } from "@/content/pages";
import { alternates, getI18n } from "@/i18n/server";

export function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/help/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()]);
  const page = getPages(locale)[slug];
  return page ? { title: page.title, description: page.description, alternates: alternates(locale, `/help/${slug}`) } : {};
}

export default async function HelpPage({ params }: PageProps<"/[locale]/help/[slug]">) {
  const [{ slug }, { locale, t }] = await Promise.all([params, getI18n()]);
  const page = getPages(locale)[slug];
  if (!page) notFound();
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-4xl font-extrabold">{page.title}</h1>
      <p className="mt-2 text-lg text-ink-soft">{page.description}</p>
      {page.legalReviewRequired && (
        <p className="mt-6 flex gap-2 rounded-xl bg-sun-soft p-4 text-sm">
          <AlertTriangle className="shrink-0 text-coral-strong" size={18} aria-hidden="true" />
          {t.legal.draft}
        </p>
      )}
      <div className="mt-8 space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-2xl font-bold">{s.heading}</h2>
            {s.body.map((p) => <p key={p} className="mt-2 text-ink-soft">{p}</p>)}
          </section>
        ))}
      </div>
    </article>
  );
}
