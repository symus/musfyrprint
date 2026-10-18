# Re-branding & market configuration

The working name **musfyr print** is configuration, not code.

## Brand

| What | Backend (`application.yml` / env) | Frontend (build-time env) |
| --- | --- | --- |
| Name | `BRAND_NAME` | `NEXT_PUBLIC_BRAND_NAME` (words after the first render in the logo pill) |
| Tagline | `BRAND_TAGLINE` | `NEXT_PUBLIC_BRAND_TAGLINE`, `NEXT_PUBLIC_BRAND_HERO_TITLE` |
| Contact | `BRAND_SUPPORT_EMAIL`, `BRAND_SUPPORT_PHONE`, `BRAND_ADDRESS` | `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_COMPANY_ADDRESS` |
| Social links | `BRAND_SOCIAL_*` | `NEXT_PUBLIC_SOCIAL_*` (empty = hidden) |
| Site URL (SEO, sitemap) | – | `NEXT_PUBLIC_SITE_URL` |

* **Logo mark:** `frontend/src/components/brand/Logo.tsx` (inline SVG) and `frontend/src/app/icon.svg` (favicon).
* **Colours & fonts:** tokens in `frontend/src/app/globals.css` (`@theme`). Keep text pairings ≥ 4.5:1 contrast —
  the Playwright axe test fails the build otherwise.
* `NEXT_PUBLIC_*` values are compiled into the client bundle, so rebuild the frontend image after changing them.

## Currency & locale

* `DEFAULT_CURRENCY` (backend) is used for new products when none is given; each product stores its own currency.
* `NEXT_PUBLIC_DEFAULT_LOCALE` controls number/currency formatting (`pl-PL` → `59,00 zł`).
* `NEXT_PUBLIC_CONTENT_LANGUAGE` sets `<html lang>` until translations ship (Phase 5).
* Multi-currency *pricing* (separate price lists per market rather than FX conversion) is designed into the Phase 3
  pricing service.

## Tax

VAT is not calculated yet. Phase 3 introduces a `TaxService` with per-country rates (Polish 23 % standard VAT,
EU OSS for cross-border B2C, UK VAT, US sales tax via a provider). Displayed prices are labelled "incl. VAT where
applicable" until then.

## Payment providers

Phase 3 adds a `PaymentProvider` interface; enabling Stripe, PayPal or Przelewy24/BLIK will be a matter of setting
their keys (see `.env.example`) and toggling them per market.
