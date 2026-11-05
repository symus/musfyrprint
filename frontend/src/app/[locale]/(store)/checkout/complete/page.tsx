import type { Metadata } from "next";
import { Suspense } from "react";

import { getI18n } from "@/i18n/server";
import { PaymentComplete } from "@/components/commerce/PaymentComplete";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      
      <Suspense fallback={<p className="card p-6 text-ink-soft">{t.common.loading}</p>}>
        <PaymentComplete />
      </Suspense>
    </div>
  );
}
