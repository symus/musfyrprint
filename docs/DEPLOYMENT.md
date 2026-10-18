# Deployment

## Topology

```
Internet → CDN / TLS load balancer
            ├── /api/*  → backend (Spring Boot, port 8080; management port 8081 internal only)
            └── /*      → frontend (Next.js standalone, port 3000)
backend → PostgreSQL (managed, private network)
```

Both images are stateless; scale horizontally after moving rate limiting/caches to Redis (see ROADMAP).

## Build & run

```bash
docker build -t musfyr/backend ./backend
docker build -t musfyr/frontend \
  --build-arg NEXT_PUBLIC_BRAND_NAME="musfyr print" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://shop.example.com" ./frontend

docker run -e SPRING_PROFILES_ACTIVE=prod -e DB_URL=… -e DB_USERNAME=… -e DB_PASSWORD=… \
           -e JWT_SECRET="$(openssl rand -base64 48)" -e CORS_ALLOWED_ORIGINS=https://shop.example.com \
           -e BOOTSTRAP_ADMIN_EMAIL=… -e BOOTSTRAP_ADMIN_PASSWORD=… -p 8080:8080 musfyr/backend
docker run -e API_INTERNAL_URL=http://backend:8080 -p 3000:3000 musfyr/frontend
```

The `prod` profile: no seed data, refuses to start without a 32-byte `JWT_SECRET`, secure cookies, ECS-JSON logs,
Actuator on `MANAGEMENT_PORT` (default 8081) — expose `/actuator/health/liveness|readiness` to the orchestrator and
`/actuator/prometheus` to monitoring only.

## Production-readiness checklist

- [ ] TLS everywhere; HSTS at the load balancer; `COOKIE_SECURE=true`
- [ ] Secrets from a secret manager (not `.env` files); rotate `JWT_SECRET` and DB credentials
- [ ] Remove `BOOTSTRAP_ADMIN_*` after the first admin exists; enforce strong staff passwords
- [ ] Load balancer overwrites `X-Forwarded-For` (rate limiting and audit IPs rely on it)
- [ ] Swagger UI disabled or protected in prod (`SPRINGDOC_SWAGGER_UI_ENABLED=false`, `SPRINGDOC_API_DOCS_ENABLED=false`)
- [ ] Managed PostgreSQL with PITR; daily snapshots retained ≥ 30 days; restore drill each quarter (below)
- [ ] Log shipping + alerts on 5xx rate, p95 latency, failed logins, DB pool saturation
- [ ] Redis for rate limits before running > 1 backend replica
- [ ] Legal review of policies for each launch market; cookie consent before any analytics
- [ ] Run `mvn verify`, `npm test`, `npm run e2e` against staging before each release

## Backups & recovery

```bash
# Logical backup (in addition to managed PITR)
pg_dump --format=custom --no-owner "$DATABASE_URL" > musfyr-$(date +%F).dump
# Restore into a fresh database
createdb musfyr_restore && pg_restore --no-owner -d musfyr_restore musfyr-YYYY-MM-DD.dump
```

Flyway validates the schema on start-up, so a restored database must be at the same or an older migration version
than the deployed backend (older versions are migrated forward automatically).
