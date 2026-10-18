# Roadmap

Legend: ✅ done · 🟡 partial / prepared · ⬜ not started. Nothing marked ⬜ is exposed in the UI as if it worked.

## Phase 1 — Foundation ✅

| Item | Status |
| --- | --- |
| Monorepo structure, architecture, CI | ✅ |
| Design system (tokens, logo, typography, components), responsive storefront | ✅ |
| PostgreSQL schema + Flyway migrations, dev seed data (18 products, 313 SKUs) | ✅ |
| Catalogue API: search (FTS + typo tolerance), filters, facets, autocomplete, collections | ✅ |
| Product detail with DB-driven colours, sizes, options, print areas, print methods | ✅ |
| Admin: staff login, product CRUD, publish rules, variants & stock, categories, colours, audit log | ✅ |
| Bulk-quote capture + admin pipeline; newsletter capture with consent record | ✅ |
| Security baseline: HttpOnly JWT cookie, CSRF, RBAC, lockout, rate limits, problem details, headers | ✅ |
| Tests: 16 unit + 21 integration (backend), 17 component/unit + 12 E2E incl. axe (frontend) | ✅ |
| Docker images, compose, health checks, structured logs | ✅ |

## Phase 2 — Design experience ⬜ (next)

* **2D editor** (Fabric.js): text, fonts, uploads, shapes, layers, undo/redo, snapping, print-area & safe-zone
  overlays, low-DPI warnings, per-zone designs (front/back/chest/sleeve), duplicate design.
* **Design persistence**: `designs`, `design_versions` (JSON canvas document + rendered assets), drafts, sharing links.
* **Artwork upload**: S3-compatible storage, presigned uploads, MIME sniffing, SVG sanitisation, size limits,
  malware-scan hook, rights confirmation, moderation queue.
* **Templates**: categories from the brief, admin create/approve/retire, original assets only.
* **3D preview** (React Three Fiber): GLB garment models with UV-mapped print surfaces; the canvas for each print
  zone is rendered to a texture and applied to that zone's material/decal. Fallback to 2D mock-ups on low-end devices.
* **International sizing**: `size_charts` per product × fit × supplier with measurements (cm/in) and regional labels
  (EU/UK/US/CN/IN), measurement guide, recommendation assistant. Regional switch changes labels only, never the SKU.
* AI module interface (`AiDesignProvider`) with an explicit "not configured" state.

### 3D asset requirements (for Phase 2)

| Requirement | Detail |
| --- | --- |
| Format | glTF 2.0 binary (`.glb`), Draco or Meshopt compressed, ≤ 2 MB per garment |
| Models | Adult tee (regular/fitted/oversized), long-sleeve, tank, hoodie, sweatshirt, baby bodysuit, kids/teen tee, tote, flat sticker plane |
| UVs | Non-overlapping UV islands per print zone (front, back, left/right chest, sleeves) named `print_<ZONE>` to match `print_areas.code` |
| Materials | PBR (base colour tinted at runtime, normal + roughness maps for fabric), separate material per print zone |
| Scale | Real-world metres so millimetre print areas map 1:1 |
| Licence | Owned or commercially licensed for modification and display |

Preview accuracy limits to communicate to customers: fabric folds and stretch are simulated, print curvature on
seams is approximate, and screen colours differ from ink on fabric.

## Phase 3 — Commerce ⬜

Customer accounts (email verification, password reset, Google/Apple/Facebook OIDC, phone OTP, refresh tokens with
rotation & revocation, GDPR export/deletion), guest checkout, cart, single authoritative `PricingService`
(variant + options + print zones + quantity tiers + promotions + gift cards + shipping + VAT/OSS), checkout,
Stripe/PayPal/Przelewy24/BLIK via a `PaymentProvider` SPI with signed, idempotent webhooks, orders and order history.

## Phase 4 — Fulfilment ⬜

Artwork validation pipeline and print-file generation per method/supplier, production queue with QC and reprints,
`ShippingProvider` SPI (InPost incl. pickup points, DHL, DPD, UPS), labels, tracking webhooks with honest manual
fallback, notifications (e-mail/SMS), refunds, returns, support tickets, reviews moderation, loyalty/referrals,
admin reports and integration/webhook monitoring.

## Phase 5 — Production readiness ⬜

Redis for rate limits/caches, refresh-token revocation store, CDN for assets, i18n (pl/en first) and multi-currency
display, consent banner + analytics, load tests, security review/pen-test, backup drills, SLOs and alerting.

## Open TODOs in code

| Location | TODO |
| --- | --- |
| `quotes/QuoteService.java` | Notify sales inbox once e-mail delivery exists (Phase 4). |
| `app/sitemap.ts` | Page through products when the catalogue exceeds 60 items. |
| `common/ratelimit/RateLimiter.java` | Redis-backed implementation for multi-instance deployments. |
| Newsletter | Double opt-in confirmation e-mail (Phase 4); records stay `PENDING_CONFIRMATION` until then. |
| Legal pages | Templates flagged in the UI — require legal review per market. |
