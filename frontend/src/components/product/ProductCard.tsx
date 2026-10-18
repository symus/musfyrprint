import Link from "next/link";

import type { ProductSummary } from "@/lib/api/types";
import { GarmentArt } from "./GarmentArt";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";

const BG = ["bg-sun-soft", "bg-violet-soft", "bg-mint-soft", "bg-cloud"];

export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  const lead = product.colors[0];
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
      <div className={`relative aspect-square ${BG[index % BG.length]}`}>
        <GarmentArt
          garmentType={product.garmentType}
          colorHex={lead?.hex}
          title={`${product.name}${lead ? ` in ${lead.name}` : ""}`}
          className="h-full w-full p-6 transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isNew && <span className="chip bg-ink text-paper">New</span>}
          {product.customizable && <span className="chip bg-white text-ink">Customisable</span>}
          {!product.inStock && <span className="chip bg-danger text-white">Out of stock</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{product.categoryName}</p>
        <h3 className="font-display text-lg font-bold leading-tight">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        {product.ratingCount > 0 && <Stars rating={product.ratingAvg} count={product.ratingCount} />}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price value={product.priceFrom} compareAt={product.compareAt} from />
          <ColorDots colors={product.colors} />
        </div>
      </div>
    </article>
  );
}

export function ColorDots({ colors, max = 5 }: { colors: ProductSummary["colors"]; max?: number }) {
  if (colors.length === 0) return null;
  const shown = colors.slice(0, max);
  return (
    <span className="flex items-center" aria-label={`${colors.length} colour${colors.length === 1 ? "" : "s"}`}>
      {shown.map((c) => (
        <span
          key={c.code}
          title={c.name}
          className="-ml-1 inline-block size-4 rounded-full border-2 border-white ring-1 ring-line first:ml-0"
          style={{ background: c.hex }}
        />
      ))}
      {colors.length > max && <span className="ml-1 text-xs text-ink-soft">+{colors.length - max}</span>}
    </span>
  );
}

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <ProductCard product={p} index={i} />
          </div>
        </li>
      ))}
    </ul>
  );
}
