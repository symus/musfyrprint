import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { brand } from "@/config/brand";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/category/t-shirts", label: "T-shirts" },
      { href: "/category/stickers", label: "Stickers" },
      { href: "/collections", label: "Collections" },
      { href: "/offers", label: "Offers" },
    ],
  },
  {
    title: "Create",
    links: [
      { href: "/design", label: "Design studio" },
      { href: "/collections/family-matching", label: "Family matching" },
      { href: "/collections/birthday-gifts", label: "Gifts" },
      { href: "/custom-orders", label: "Bulk & business orders" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help/faq", label: "FAQ" },
      { href: "/help/shipping", label: "Shipping" },
      { href: "/help/returns", label: "Returns & refunds" },
      { href: "/help/contact", label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/help/terms", label: "Terms of sale" },
      { href: "/help/privacy", label: "Privacy policy" },
      { href: "/help/cookies", label: "Cookie policy" },
      { href: "/help/content-policy", label: "Artwork & content policy" },
    ],
  },
];

export function SiteFooter() {
  const social = Object.entries(brand.social).filter(([, url]) => url);
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-sm text-paper/80">{brand.tagline} Personalised apparel and stickers, printed to order.</p>
          <div className="rounded-2xl bg-white/5 p-5">
            <p className="font-display text-lg font-bold">Get ideas & offers</p>
            <p className="mb-3 text-sm text-paper/70">New templates, seasonal drops and member-only codes.</p>
            <NewsletterForm source="footer" tone="dark" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 font-display text-base font-bold text-sun">{col.title}</h2>
              <ul className="space-y-2 text-sm text-paper/80">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-paper hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-paper/70 md:flex-row md:items-center md:justify-between">
          <address className="not-italic">
            <a href={`mailto:${brand.supportEmail}`} className="hover:underline">{brand.supportEmail}</a>
            {" · "}
            <a href={`tel:${brand.supportPhone.replace(/\s/g, "")}`} className="hover:underline">{brand.supportPhone}</a>
            {" · "}
            {brand.address}
          </address>
          {social.length > 0 && (
            <ul className="flex gap-4">
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} rel="noopener noreferrer" target="_blank" className="capitalize hover:underline">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p>© {brand.name}</p>
        </div>
      </div>
    </footer>
  );
}
