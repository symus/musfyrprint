import Link from "next/link";
import { Building2 } from "lucide-react";

import { GarmentArt } from "@/components/product/GarmentArt";

export function BusinessBanner() {
  return (
    <section className="container-page py-8" aria-labelledby="business-heading">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-violet-strong p-8 text-white md:grid-cols-[1.4fr_1fr] md:p-12">
        <div>
          <p className="chip mb-4 bg-white/10 text-white"><Building2 size={14} aria-hidden="true" /> Business & bulk</p>
          <h2 id="business-heading" className="text-3xl font-extrabold sm:text-4xl">Merch for teams, schools, events and brands</h2>
          <p className="mt-3 max-w-xl text-white">
            Branded tees, hoodies, totes and packaging labels from 10 pieces. Tell us what you need and our team
            will prepare a tailored quotation.
          </p>
          <Link href="/custom-orders" className="btn mt-6 bg-sun text-ink hover:bg-white">
            Request a quote
          </Link>
        </div>
        <div className="relative hidden h-56 md:block" aria-hidden="true">
          <GarmentArt garmentType="TSHIRT" colorHex="#FFFFFF" className="absolute left-0 top-0 w-1/2 -rotate-6" />
          <GarmentArt garmentType="TOTE" colorHex="#EFE6D2" className="absolute bottom-0 right-8 w-1/2 rotate-6" />
        </div>
      </div>
    </section>
  );
}
