import Link from "next/link";

import { GarmentArt } from "@/components/product/GarmentArt";
import type { CategoryView } from "@/lib/api/types";

const ART: Record<string, { type: string; hex: string }> = {
  "t-shirts": { type: "TSHIRT", hex: "#FFFFFF" },
  "hoodies-sweatshirts": { type: "HOODIE", hex: "#1F2A4A" },
  baby: { type: "BODYSUIT", hex: "#F8C8D8" },
  "kids-teens": { type: "TSHIRT", hex: "#A8D8F5" },
  stickers: { type: "STICKER_DIE_CUT", hex: "#FFFFFF" },
  "bags-merch": { type: "TOTE", hex: "#EFE6D2" },
};

export function CategoryTiles({ categories }: { categories: CategoryView[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {categories.filter((c) => !c.parentSlug).map((c) => {
        const art = ART[c.slug] ?? { type: c.productFamily === "STICKER" ? "STICKER_DIE_CUT" : "TSHIRT", hex: "#FFFFFF" };
        return (
          <li key={c.slug}>
            <Link
              href={`/category/${c.slug}`}
              className="group card flex h-full flex-col items-center gap-3 p-4 text-center transition hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
            >
              <span className="flex aspect-square w-full items-center justify-center rounded-2xl" style={{ background: `${c.accentHex ?? "#F4EEE4"}33` }}>
                <GarmentArt garmentType={art.type} colorHex={art.hex} showPrint={false} className="w-4/5 transition group-hover:scale-110" title={c.name} />
              </span>
              <span className="font-display font-bold leading-tight">{c.name}</span>
              <span className="text-xs text-ink-soft">{c.productCount} products</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
