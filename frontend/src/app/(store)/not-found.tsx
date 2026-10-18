import Link from "next/link";

import { GarmentArt } from "@/components/product/GarmentArt";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <GarmentArt garmentType="STICKER_DIE_CUT" className="w-40 -rotate-6" title="" />
      <h1 className="mt-6 text-4xl font-extrabold">This page has peeled off</h1>
      <p className="mt-2 text-ink-soft">We couldn&apos;t find what you were looking for.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-primary">Back home</Link>
        <Link href="/shop" className="btn btn-secondary">Shop products</Link>
      </div>
    </div>
  );
}
