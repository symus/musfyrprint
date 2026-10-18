import { Package, PenTool, Shirt } from "lucide-react";

const STEPS = [
  { icon: Shirt, title: "Pick a product", text: "Tees, hoodies, baby bodysuits, totes or stickers – in the colour and size you need." },
  { icon: PenTool, title: "Make it yours", text: "Choose a template, add names and dates, or upload your own artwork with print-area guides." },
  { icon: Package, title: "We print & ship", text: "Every order is checked for print quality, produced to order and tracked to your door." },
];

export function HowItWorks() {
  return (
    <section className="container-page py-16" aria-labelledby="how-heading">
      <p className="eyebrow mb-2">How it works</p>
      <h2 id="how-heading" className="mb-8 text-3xl font-extrabold sm:text-4xl">Three steps from idea to wardrobe</h2>
      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
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
