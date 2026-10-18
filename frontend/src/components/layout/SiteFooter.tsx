import { Logo } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const f = t.footer;
  const columns = [
    { title: f.shop, links: [["/shop", f.allProducts], ["/category/t-shirts", f.tshirts], ["/category/stickers", f.stickers], ["/collections", t.nav.collections], ["/offers", t.nav.offers]] },
    { title: f.create, links: [["/design", f.studio], ["/collections/family-matching", f.familyMatching], ["/collections/birthday-gifts", f.gifts], ["/custom-orders", f.bulk]] },
    { title: f.help, links: [["/help/faq", f.faq], ["/help/shipping", f.shipping], ["/help/returns", f.returns], ["/help/contact", f.contact]] },
    { title: f.legal, links: [["/help/terms", f.terms], ["/help/privacy", f.privacy], ["/help/cookies", f.cookies], ["/help/content-policy", f.contentPolicy]] },
  ];
  const social = Object.entries(brand.social).filter(([, url]) => url);
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-sm text-paper/80">{t.brand.tagline} {f.blurb}</p>
          <div className="rounded-2xl bg-white/5 p-5">
            <p className="font-display text-lg font-bold">{f.newsletterTitle}</p>
            <p className="mb-3 text-sm text-paper/70">{f.newsletterText}</p>
            <NewsletterForm source="footer" tone="dark" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 font-display text-base font-bold text-sun">{col.title}</h2>
              <ul className="space-y-2 text-sm text-paper/80">
                {col.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="hover:text-paper hover:underline">{label}</Link></li>
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
                <li key={name}><a href={url} rel="noopener noreferrer" target="_blank" className="capitalize hover:underline">{name}</a></li>
              ))}
            </ul>
          )}
          <p>© {brand.name}</p>
        </div>
      </div>
    </footer>
  );
}
