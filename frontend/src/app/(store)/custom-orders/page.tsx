import type { Metadata } from "next";
import { Suspense } from "react";
import { Building2, GraduationCap, PartyPopper, Trophy } from "lucide-react";

import { QuoteForm } from "@/components/forms/QuoteForm";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { apiGet } from "@/lib/api/server";
import type { Page, ProductSummary } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Bulk & business orders",
  description: "Custom merchandise for companies, schools, teams and events. Request a tailored quote from 10 pieces.",
};

const USES = [
  { icon: Building2, title: "Companies", text: "Team tees, onboarding kits and branded packaging labels." },
  { icon: GraduationCap, title: "Schools & clubs", text: "Class shirts, leavers' hoodies and name labels." },
  { icon: Trophy, title: "Sports teams", text: "Names and numbers with heat-transfer or DTF prints." },
  { icon: PartyPopper, title: "Events", text: "Festival, wedding and family-reunion merchandise." },
];

export default function CustomOrdersPage() {
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">Business & bulk</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">Custom orders, made simple</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Tell us what you need and we&apos;ll come back with pricing, print-method advice and a production timeline.
        Screen printing becomes the most economical option from roughly 30 pieces.
      </p>
      <ul className="my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USES.map((u) => (
          <li key={u.title} className="card p-5">
            <u.icon className="text-violet" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-bold">{u.title}</p>
            <p className="text-sm text-ink-soft">{u.text}</p>
          </li>
        ))}
      </ul>
      <Suspense fallback={<BlockSkeleton className="h-96" />}>
        <FormWithProducts />
      </Suspense>
    </div>
  );
}

async function FormWithProducts() {
  const page = await apiGet<Page<ProductSummary>>("/api/v1/catalog/products?size=60&sort=POPULAR").catch(() => null);
  return <QuoteForm productOptions={page?.items.map((p) => p.name) ?? []} />;
}
