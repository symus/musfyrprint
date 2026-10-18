import { Package, PenTool, Shirt } from "lucide-react";

import { getI18n } from "@/i18n/server";

const ICONS = [Shirt, PenTool, Package];

export async function HowItWorks() {
  const { t } = await getI18n();
  const steps = t.how.steps.map((s, i) => ({ ...s, icon: ICONS[i] }));
  return (
    <section className="container-page py-16" aria-labelledby="how-heading">
      <p className="eyebrow mb-2">{t.how.eyebrow}</p>
      <h2 id="how-heading" className="mb-8 text-3xl font-extrabold sm:text-4xl">{t.how.title}</h2>
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="card relative p-6">
            <span className="absolute -top-4 right-6 flex size-10 items-center justify-center rounded-full bg-sun font-display text-lg font-extrabold">
              {i + 1}
            </span>
            <s.icon className="mb-4 text-violet" size={32} aria-hidden="true" />
            <h3 className="text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
