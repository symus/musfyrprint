import { Building2 } from "lucide-react";

import { GarmentArt } from "@/components/product/GarmentArt";
import { Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export async function BusinessBanner() {
  const { t } = await getI18n();
  const b = t.business;
  return (
    <section className="container-page py-8" aria-labelledby="business-heading">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-violet-strong p-8 text-white md:grid-cols-[1.4fr_1fr] md:p-12">
        <div>
          <p className="chip mb-4 bg-white/10 text-white"><Building2 size={14} aria-hidden="true" /> {b.chip}</p>
          <h2 id="business-heading" className="text-3xl font-extrabold sm:text-4xl">{b.title}</h2>
          <p className="mt-3 max-w-xl text-white">
            {b.text}
          </p>
          <Link href="/custom-orders" className="btn mt-6 bg-sun text-ink hover:bg-white">
            {b.cta}
          </Link>
        </div>
        <div className="relative hidden h-56 md:block" aria-hidden="true">
          <GarmentArt printText={t.art.yourIdea} garmentType="TSHIRT" colorHex="#FFFFFF" className="absolute left-0 top-0 w-1/2 -rotate-6" />
          <GarmentArt printText={t.art.yourIdea} garmentType="TOTE" colorHex="#EFE6D2" className="absolute bottom-0 right-8 w-1/2 rotate-6" />
        </div>
      </div>
    </section>
  );
}
