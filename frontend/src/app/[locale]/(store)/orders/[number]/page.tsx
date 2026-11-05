import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getI18n } from "@/i18n/server";
import { OrderPage } from "@/components/account/TokenPages";

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const [{ t }, { number }] = await Promise.all([getI18n(), params]);
  return { title: `${t.orders.number} ${number}`, robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { t } = await getI18n();
  return (
    <div className="container-page py-10">
      <Suspense fallback={<p className="card p-6 text-ink-soft">{t.common.loading}</p>}>
        <Order params={params} />
      </Suspense>
    </div>
  );
}

async function Order({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^MP-\d{1,12}$/.test(number)) notFound();
  return <OrderPage number={number} guest={true} />;
}
