import { GarmentArt } from "@/components/product/GarmentArt";
import { Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <GarmentArt garmentType="STICKER_DIE_CUT" className="w-40 -rotate-6" title="" />
      <h1 className="mt-6 text-4xl font-extrabold">{t.notFound.title}</h1>
      <p className="mt-2 text-ink-soft">{t.notFound.text}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-primary">{t.notFound.home}</Link>
        <Link href="/shop" className="btn btn-secondary">{t.notFound.shop}</Link>
      </div>
    </div>
  );
}
