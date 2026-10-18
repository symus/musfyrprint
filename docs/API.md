# API guide

Base path `/api/v1`. Interactive docs: `http://localhost:8080/swagger-ui.html`; machine-readable spec at
`/v3/api-docs` (use it to generate clients).

## Conventions

* JSON in and out. Money is `{ "amountMinor": 5900, "currency": "PLN" }` (59,00 zł).
* Lists are paged: `{ items, page, size, totalItems, totalPages }` (zero-based `page`).
* Errors are RFC 9457 problem details and always include `correlationId` (also returned as `X-Request-Id`):

```json
{ "type": "https://docs.musfyr.print/errors/validation-failed", "title": "Validation Failed", "status": 400,
  "detail": "One or more fields are invalid.", "errors": [{ "field": "slug", "message": "must be lowercase words separated by hyphens" }],
  "correlationId": "5d1c…" }
```

* **Browser auth:** `GET /auth/csrf` once (sets `XSRF-TOKEN` cookie) → send its value as `X-XSRF-TOKEN` on every
  POST/PUT/PATCH/DELETE. `POST /auth/login` sets the `mp_at` HttpOnly session cookie.
* **API clients:** send `Authorization: Bearer <jwt>`; CSRF does not apply.

## Public endpoints

| Method & path | Purpose |
| --- | --- |
| `GET /catalog/products` | Search/filter: `q, category, collection, family, ageGroup, gender, fit, color (repeatable), minPrice, maxPrice (minor units), tag, customizable, sort (FEATURED, NEWEST, PRICE_ASC, PRICE_DESC, RATING, POPULAR, RELEVANCE), page, size≤60` |
| `GET /catalog/products/{slug}` | Detail: variants with availability band (never exact stock), sizes, options, print areas, print methods |
| `GET /catalog/products/{slug}/related` · `/reviews` | Related products · approved reviews |
| `GET /catalog/categories[/{slug}]` · `/collections[/{slug}]` | Navigation data with product counts |
| `GET /catalog/facets` | Filter options derived from active products |
| `GET /catalog/suggest?q=` | Autocomplete (typo tolerant) |
| `GET /storefront/home` | Homepage aggregate |
| `GET /promotions/active` · `GET /site/config` | Banner promotions · brand & market config |
| `POST /newsletter/subscriptions` | `{ email, consent: true, source?, locale? }` → 202 (same response whether or not already subscribed) |
| `POST /quotes` | Bulk quote `{ contactName, email, productInterest, quantity ≥ 10, … }` → 201 `{ reference }` |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `GET /auth/csrf` | Session |

## Admin endpoints (staff roles)

| Method & path | Roles |
| --- | --- |
| `GET/POST /admin/products`, `GET/PUT /admin/products/{id}` | ADMIN, DESIGNER |
| `POST /admin/products/{id}/status` `{ status }` | ADMIN, DESIGNER (publishing requires an active variant) |
| `POST /admin/products/{id}/variants/generate` | ADMIN, DESIGNER |
| `PUT /admin/products/{id}/variants/{variantId}` | ADMIN, DESIGNER |
| `GET /admin/categories`, `POST/PUT` | read: ADMIN, DESIGNER · write: ADMIN |
| `GET/POST /admin/colors` | ADMIN, DESIGNER |
| `GET /admin/quotes`, `POST /admin/quotes/{id}/status` | ADMIN, SUPPORT |
| `GET /admin/audit-logs` | ADMIN |

## Examples

```bash
# Black T-shirts, cheapest first
curl 'http://localhost:8080/api/v1/catalog/products?category=t-shirts&color=black&sort=PRICE_ASC&size=12'

# Session login from a script (cookie jar + CSRF)
curl -c jar -b jar http://localhost:8080/api/v1/auth/csrf
XSRF=$(awk '/XSRF-TOKEN/{print $7}' jar)
curl -c jar -b jar -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json' \
     -d '{"email":"admin@musfyr.local","password":"ChangeMe-Admin-2026!"}' http://localhost:8080/api/v1/auth/login

# Create a draft product
curl -b jar -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json' http://localhost:8080/api/v1/admin/products -d '{
  "categoryId": "<uuid from /admin/categories>", "slug": "team-tee", "name": "Team Tee",
  "productFamily": "APPAREL", "garmentType": "TSHIRT", "ageGroup": "ADULT", "fit": "REGULAR",
  "basePriceMinor": 5500, "customizable": true, "colorCodes": ["white", "black"] }'
# → 201 { "id": "…", "status": "DRAFT", "version": 0, … }

# Generate S–XL for every product colour, 20 in stock each
curl -b jar -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json' \
  http://localhost:8080/api/v1/admin/products/<id>/variants/generate \
  -d '{"sizeCodes":["S","M","L","XL"],"initialStock":20,"skuPrefix":"TEAM"}'
```
