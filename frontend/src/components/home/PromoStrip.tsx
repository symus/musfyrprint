import type { PromotionView } from "@/lib/api/types";

export function PromoStrip({ promotions, useCode }: { promotions: PromotionView[]; useCode: string }) {
  if (promotions.length === 0) return null;
  return (
    <div className="bg-ink text-paper">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-1 py-2 text-sm">
        {promotions.map((p) => (
          <li key={p.code ?? p.title}>
            <span className="font-semibold">{p.title}</span>
            {p.code && (
              <>
                {` – ${useCode} `}
                <code className="rounded bg-sun px-1.5 py-0.5 font-bold text-ink">{p.code}</code>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
