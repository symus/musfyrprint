import type { Metadata } from "next";
import { Suspense } from "react";

import { getI18n } from "@/i18n/server";
import { CartPage } from "@/components/commerce/CartPage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.cart.title, robots: { index: false } };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-4xl font-extrabold">{t.cart.title}</h1>
      <Suspense fallback={<p className="card p-6 text-ink-soft">{t.common.loading}</p>}>
        <CartPage />
      </Suspense>
    </div>
  );
}
