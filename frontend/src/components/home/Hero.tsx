import Link from "next/link";
import { ArrowRight, Palette, Ruler, Sparkles, Truck } from "lucide-react";

import { GarmentArt } from "@/components/product/GarmentArt";
import { brand } from "@/config/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-sun-soft blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-24 size-[22rem] rounded-full bg-violet-soft blur-2xl" />
      <div className="container-page relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
        <div>
          <p className="chip mb-5 bg-white text-ink ring-1 ring-line">
            <Sparkles size={14} aria-hidden="true" className="text-coral" /> {brand.tagline}
          </p>
          <h1 className="text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">
            {brand.heroTitle.split(",")[0]},{" "}
            <span className="relative inline-block text-coral-strong">
              {brand.heroTitle.split(",").slice(1).join(",").trim() || "Your Style."}
              <svg aria-hidden="true" viewBox="0 0 300 20" className="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none">
                <path d="M4 14 Q80 2 150 10 T296 8" stroke="var(--color-sun)" strokeWidth="7" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Personalised T-shirts, hoodies, baby clothes and stickers. Start from a template or upload your own
            artwork – we print every piece to order.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/design" className="btn btn-primary text-lg">
              <Palette size={20} aria-hidden="true" /> Design Your Own
            </Link>
            <Link href="/shop" className="btn btn-secondary text-lg">
              Shop Products <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2"><Ruler size={18} className="text-violet" aria-hidden="true" /> Baby to adult sizing</li>
            <li className="flex items-center gap-2"><Palette size={18} className="text-violet" aria-hidden="true" /> Templates or your art</li>
            <li className="flex items-center gap-2"><Truck size={18} className="text-violet" aria-hidden="true" /> Made to order</li>
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-lg" aria-hidden="true">
          <div className="absolute inset-[8%] rotate-3 rounded-[3rem] bg-coral" />
          <div className="absolute inset-[8%] -rotate-3 rounded-[3rem] border-4 border-ink bg-paper" />
          <GarmentArt garmentType="TSHIRT" colorHex="#6A4DF4" className="absolute left-[14%] top-[12%] w-[62%] animate-float" />
          <GarmentArt garmentType="BODYSUIT" colorHex="#FFC23C" className="absolute bottom-[8%] left-[4%] w-[34%] -rotate-6 animate-float [animation-delay:-2s]" />
          <GarmentArt garmentType="HOODIE" colorHex="#2EC4A6" showPrint={false} className="absolute bottom-[6%] right-[4%] w-[40%] rotate-6 animate-float [animation-delay:-4s]" />
          <GarmentArt garmentType="STICKER_DIE_CUT" className="absolute right-[6%] top-[4%] w-[26%] rotate-12" />
        </div>
      </div>
    </section>
  );
}
