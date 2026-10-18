/**
 * Brand configuration. Values come from NEXT_PUBLIC_* variables at build time so the storefront can be
 * re-branded without code changes (see docs/BRANDING.md). The backend exposes the same values at
 * /api/v1/site/config for e-mails and integrations. Translatable copy (tagline, hero) lives in src/i18n/messages.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "musfyr print",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME ?? "musfyr",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@example.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+48 000 000 000",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "Registered business address to be configured",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "",
    tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ?? "",
    pinterest: process.env.NEXT_PUBLIC_SOCIAL_PINTEREST ?? "",
  },
} as const;

export type Brand = typeof brand;
