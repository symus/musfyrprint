/**
 * Brand configuration. Values come from NEXT_PUBLIC_* variables at build time so the storefront can be
 * re-branded without code changes (see docs/BRANDING.md). The backend exposes the same values at
 * /api/v1/site/config for e-mails and integrations.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "musfyr print",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME ?? "musfyr",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Create It. Wear It. Stick It.",
  heroTitle: process.env.NEXT_PUBLIC_BRAND_HERO_TITLE ?? "Your Ideas, Your Style.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@example.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+48 000 000 000",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "Registered business address to be configured",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Locale used for number, currency and date formatting. */
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "pl-PL",
  /** Language of the storefront copy (until translations ship). */
  contentLanguage: process.env.NEXT_PUBLIC_CONTENT_LANGUAGE ?? "en",
  currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "PLN",
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "",
    tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ?? "",
    pinterest: process.env.NEXT_PUBLIC_SOCIAL_PINTEREST ?? "",
  },
} as const;

export type Brand = typeof brand;
