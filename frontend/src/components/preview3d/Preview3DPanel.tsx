"use client";

import { useEffect, useState } from "react";

import { GarmentArt } from "@/components/product/GarmentArt";
import { useI18n } from "@/i18n/client";
import type { SizeChart } from "@/lib/api/types";
import type { Editor } from "@/components/studio/Editor";
import { Garment3D, type View, type ZoneTextures } from "./Garment3D";
import { garmentDimensions } from "./garmentModel";

/**
 * Live 3D preview of the design in the studio. Re-renders each print area to a texture shortly after the design
 * changes, and sizes the garment from the selected size's garment measurements.
 */
export default function Preview3DPanel({ editor, garmentType, colorHex, slug, sizeCode }: {
  editor: Editor;
  garmentType: string;
  colorHex: string;
  slug: string;
  sizeCode: string | null;
}) {
  const { t, locale } = useI18n();
  const s = t.studio;
  const [view, setView] = useState<View>("front");
  const [textures, setTextures] = useState<ZoneTextures>({});
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => editor.subscribe(() => setTick((n) => n + 1)), [editor]);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      const doc = editor.document();
      const next: ZoneTextures = {};
      for (const z of editor.zones) {
        next[z.code] = doc.zones[z.code] ? await editor.renderZone(z.code, 1024) : null;
      }
      if (!cancelled) setTextures(next);
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [editor, tick]);

  useEffect(() => {
    if (garmentType.startsWith("STICKER") || garmentType === "TOTE") return; // no size chart for these
    fetch(`/api/v1/catalog/products/${slug}/size-chart`, { headers: { "Accept-Language": locale } })
      .then((r) => (r.ok ? r.json() : null)).then(setChart).catch(() => undefined);
  }, [slug, locale, garmentType]);

  const row = chart?.rows.find((r) => r.sizeCode === sizeCode) ?? chart?.rows[Math.floor((chart?.rows.length ?? 1) / 2)] ?? null;
  const dims = garmentDimensions(garmentType, row);
  // Side view only makes sense for garments, the back only when the product has a back print area.
  const views: View[] = garmentType.startsWith("STICKER") ? ["front"] : editor.zones.some((z) => z.code === "BACK") ? ["front", "back", "side"] : ["front", "side"];
  const front = textures[editor.zones[0]?.code];

  const fallback = (
    <div className="relative flex h-full items-center justify-center p-6">
      <GarmentArt garmentType={garmentType} colorHex={colorHex} showPrint={false} className="h-full w-full" title="" />
      {/* eslint-disable-next-line @next/next/no-img-element -- in-memory data URL, nothing for next/image to optimise */}
      {front && <img src={front.toDataURL()} alt="" className="absolute left-1/2 top-[30%] w-[30%] -translate-x-1/2" />}
      <p className="absolute inset-x-2 bottom-2 rounded bg-white/90 p-2 text-xs">{s.no3d}</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="aspect-square overflow-hidden rounded-xl bg-cloud">
        <Garment3D garmentType={garmentType} colorHex={colorHex} dims={dims} zones={editor.zones} textures={textures}
          view={view} fallback={fallback} label={s.preview3d} />
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={s.preview3d}>
        {views.map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${view === v ? "bg-ink text-paper" : "bg-white ring-1 ring-line"}`}>
            {s.views[v]}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">{s.rotateHint}</p>
      <p className="text-xs text-ink-soft">{s.accuracy}</p>
    </div>
  );
}
