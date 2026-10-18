import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Layers, Rotate3d, Type, Upload } from "lucide-react";

import { ProductGrid } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { apiGet } from "@/lib/api/server";
import type { Page, ProductSummary } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Design studio",
  description: "Create personalised apparel and stickers with templates, text and your own artwork.",
};

const FEATURES = [
  { icon: Type, title: "Text & names", text: "Fonts, colours and effects for names, initials, numbers and dates." },
  { icon: Upload, title: "Your artwork", text: "Upload PNG, JPG or SVG with automatic resolution and print-area checks." },
  { icon: Layers, title: "Templates & layers", text: "Original templates for birthdays, families, teams and businesses." },
  { icon: Rotate3d, title: "3D preview", text: "See your design on a rotating garment before you order." },
];

/**
 * Entry point of the design studio. The interactive editor (Fabric.js canvas + React Three Fiber preview)
 * ships in Phase 2; until then this page says so plainly and lets customers pick a product.
 */
export default function DesignPage() {
  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">Design studio</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">Design your own</h1>
      <div role="status" className="mt-6 rounded-2xl border-2 border-dashed border-violet bg-violet-soft p-5">
        <p className="font-bold">The interactive studio is opening soon.</p>
        <p className="mt-1 text-ink-soft">
          You can already browse every customisable product below. For orders of 10 or more, our team can prepare
          your design for you via a <Link className="font-semibold underline" href="/custom-orders">custom quote</Link>.
        </p>
      </div>
      <ul className="my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="card p-5">
            <f.icon className="text-coral" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-bold">{f.title}</p>
            <p className="text-sm text-ink-soft">{f.text}</p>
          </li>
        ))}
      </ul>
      <SectionHeading title="Choose a product to personalise" />
      <Suspense fallback={<ProductGridSkeleton />}>
        <Customisable />
      </Suspense>
    </div>
  );
}

async function Customisable() {
  const page = await apiGet<Page<ProductSummary>>("/api/v1/catalog/products?customizable=true&size=60").catch(() => null);
  return page ? <ProductGrid products={page.items} /> : null;
}
