# musfyr print

**Create It. Wear It. Stick It.** — a custom T-shirt, apparel and sticker e-commerce platform, built to launch in
Poland and expand to the EU, UK, India, China and the US without a rewrite.

> Status: **Phase 1 (Foundation) complete.** Storefront, catalogue, admin product management, staff auth,
> bulk-quote and newsletter capture are working end-to-end. The design studio, 3D preview, checkout and fulfilment
> arrive in Phases 2–4 — see [docs/ROADMAP.md](docs/ROADMAP.md). Nothing in the UI pretends those exist yet.

| Part | Stack |
| --- | --- |
| `frontend/` | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4 |
| `backend/` | Java 21, Spring Boot 4.1, Spring Security (JWT cookie + CSRF), JPA/Hibernate 7, Flyway |
| Database | PostgreSQL 16 (full-text + trigram search) |
| Tests | JUnit 5, Mockito, Spring integration tests on real PostgreSQL, Vitest + Testing Library, Playwright + axe |
| Ops | Docker, docker compose, GitHub Actions CI, Actuator health/Prometheus, structured JSON logs |

## Quick start

### Option A — Docker (everything)

```bash
cp .env.example .env            # fine as-is for local; set JWT_SECRET for anything shared
docker compose up --build
```

### Option B — run the apps directly (best for development)

Requirements: Java 21, Maven 3.9+, Node 22+, PostgreSQL 16.

```bash
# 1. Database
createuser musfyr -P            # password: musfyr
createdb -O musfyr musfyr

# 2. Backend  (dev profile: demo seed data + development admin)
cd backend && mvn spring-boot:run          # http://localhost:8080

# 3. Frontend
cd frontend && npm install && npm run dev  # http://localhost:3000
```

| What | Where |
| --- | --- |
| Storefront | http://localhost:3000 |
| Back office | http://localhost:3000/admin — dev login `admin@musfyr.local` / `ChangeMe-Admin-2026!` |
| API docs (Swagger UI) | http://localhost:8080/swagger-ui.html · OpenAPI JSON at `/v3/api-docs` |
| Health | http://localhost:8080/actuator/health |

The development admin and seed catalogue exist **only in the `dev` profile**. Production (`prod`) starts empty
and creates the first admin from `BOOTSTRAP_ADMIN_*` variables.

## Tests

```bash
# Backend: unit tests (no DB) + integration tests (needs PostgreSQL db "musfyr_test", see TEST_DB_URL)
createdb -O musfyr musfyr_test
cd backend && mvn verify

# Frontend: lint, types, unit/component tests, production build
cd frontend && npm run lint && npm run typecheck && npm test && npm run build

# End-to-end (with backend on :8080 and frontend on :3000 running)
cd frontend && npx playwright install chromium && npm run e2e
```

## Documentation

- [Architecture & key decisions](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE.md)
- [API guide with examples](docs/API.md)
- [Roadmap, phases & open TODOs](docs/ROADMAP.md)
- [Re-branding, currency, locale & tax configuration](docs/BRANDING.md)
- [Deployment & production-readiness checklist](docs/DEPLOYMENT.md)
- [Integrations status & setup (OAuth, payments, e-mail, SMS, shipping)](docs/INTEGRATIONS.md)
