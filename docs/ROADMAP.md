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

## Phase 1.5 — Polish + English ✅

* `/pl` and `/en` routes, language switcher, Accept-Language detection, hreflang alternates and bilingual sitemap.
* Translated catalogue content (JSONB `i18n` columns), multilingual full-text search, localised validation errors.
* Polish help/legal templates (still flagged for legal review).

## Phase 2 — Design experience ✅ (placeholder 3D models)

**Done:** ✅ International sizing – per-product reference size charts (body ranges + garment measurements), EU/UK/US/CN/IN labels stored per row (never auto-converted), cm/in, measuring guide, size finder (`SizeRecommender`, chest > height > waist; age for children), remembered size system. ✅ Render Blueprint (`render.yaml`). ✅ Artwork uploads (content-sniffed PNG/JPG/SVG, SVG safety, rights confirmation, scan hook), token-owned design drafts with server print checks, 13 original templates (EN/PL). ✅ Design studio (Fabric.js): print-area tabs, text with 7 OFL fonts/effects, shapes, uploads, templates, layers (lock/hide/order), properties, undo/redo, zoom, centre snapping, safe-zone overlay, live print checks, colour preview, save/reload/save-as-copy, print-preview PNG export. ✅ 3D preview (React Three Fiber, lazy-loaded): procedural garments from the product silhouettes, curved torso, knit bump texture, each print area as its own surface patch following the curvature (not a flat overlay), real print-area sizes, garment proportions from the selected size's chart, front/back/three-quarter views, orbit/zoom/pan incl. touch, contact shadows, sticker mode, 2D fallback without WebGL.

**Remaining for Phase 2 quality:** replace procedural garments with licensed `.glb` models (see asset requirements below), homepage 3D demo section, AI design module (`AiDesignProvider`, shows "not configured" until a provider is set), admin template editor UI (API exists).

Decisions for Phase 2 (no licensed 3D models or print supplier yet):
* 3D: procedurally generated placeholder garment meshes with proper UV print zones, swappable for licensed
  `.glb` files later via `model_key`. Clearly labelled as an approximate preview.
* Sizing & print specs: generic reference size charts and print-file specs, marked "reference – confirm with
  supplier" in the admin until a supplier is chosen.

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

## Phase 3 — Commerce 🟡 (Przelewy24 needs sandbox keys)

**Done:**
* ✅ Cart for guests and customers (cookie cart, merged on sign-in/registration), quantities, designs with their
  edit token, stock and print-check warnings, discount codes with clear error reasons.
* ✅ One pricing engine (`PriceCalculator`): variant + options + print areas + quantity tiers (10/25/50/100 →
  5/10/15/20 %) + promotions + delivery. The browser only displays server totals.
* ✅ Tax modes: `EXEMPT` (art. 113, the default while not VAT-registered) and `STANDARD` (VAT included).
* ✅ Checkout: idempotent (`Idempotency-Key`), Polish address validation, InPost Paczkomat / InPost courier /
  DPD, terms consent, order snapshots (prices, design documents, address).
* ✅ Przelewy24 REST v1 client (register, signed notifications, mandatory verify, refunds) and a simulator; payment
  return page that polls the server status, payment retry for unpaid orders.
* ✅ Accounts: registration, e-mail verification, password reset, profile, saved addresses, order history, deletion
  request. Guests get a secret order link (checkout page and confirmation e-mail).
* ✅ Admin: order list/search, order detail with payment events, refund request and confirmation (audited).
* ✅ Tests: pricing, signatures, full HTTP checkout flow through the simulator, account flow; E2E guest checkout,
  declined-then-retried payment, studio → cart, registration with cart merge, axe checks.

**Waiting for you:** Przelewy24 sandbox/production keys, SMTP settings (until then e-mails are only logged).

**Deferred:** Google/Apple/Facebook sign-in and phone OTP (need provider credentials), refresh-token rotation,
gift cards, VAT OSS for EU shipping, Stripe/PayPal, GDPR data export (deletion requests are recorded).

## Phase 4 — Fulfilment ⬜

Artwork validation pipeline and print-file generation per method/supplier, production queue with QC and reprints,
`ShippingProvider` SPI (InPost incl. pickup points, DHL, DPD, UPS), labels, tracking webhooks with honest manual
fallback, notifications (e-mail/SMS), refunds, returns, support tickets, reviews moderation, loyalty/referrals,
admin reports and integration/webhook monitoring.

## Phase 5 — Production readiness ⬜

Redis for rate limits/caches, refresh-token revocation store, CDN for assets, multi-currency
display, consent banner + analytics, load tests, security review/pen-test, backup drills, SLOs and alerting.

## Open TODOs in code

| Location | TODO |
| --- | --- |
| `quotes/QuoteService.java` | Notify sales inbox once e-mail delivery exists (Phase 4). |
| `app/sitemap.ts` | Page through products when the catalogue exceeds 60 items. |
| `common/ratelimit/RateLimiter.java` | Redis-backed implementation for multi-instance deployments. |
| Newsletter | Double opt-in confirmation e-mail (Phase 4); records stay `PENDING_CONFIRMATION` until then. |
| Legal pages | Templates flagged in the UI — require legal review per market. |
