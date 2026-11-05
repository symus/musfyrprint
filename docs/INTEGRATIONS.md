# Integrations

The platform never reports success for an integration that is not configured: each one sits behind an interface
whose default implementation answers "not configured" (or, for e-mail, only logs the message).

| Integration | Phase | Status | Planned interface |
| --- | --- | --- | --- |
| Google / Apple / Facebook sign-in (OIDC) | 3 | ⬜ | Spring Security OAuth2 client; ID tokens verified server-side; account linking only on verified e-mail |
| Phone OTP (e.g. Twilio Verify / SMSAPI.pl) | 3 | ⬜ | `OtpProvider` — OTPs hashed, short TTL, rate-limited |
| Stripe (cards, Apple Pay, Google Pay) | 3 | ⬜ | `PaymentProvider` + `/api/v1/webhooks/stripe` (signature verified, idempotency keys) |
| PayPal | 3 | ⬜ | `PaymentProvider` |
| Przelewy24 (BLIK, transfers, cards) | 3 | 🟡 code + simulator tested; sandbox keys needed | `P24Client` (REST v1, SHA-384 signatures, mandatory verify, refunds) |
| E-mail (any SMTP server) | 3 | 🟡 code done; needs SMTP settings | `Notifier` → `MailNotifier` when `SPRING_MAIL_HOST` is set, else `LogNotifier` |
| SMS | 4 | ⬜ | `Notifier` |
| InPost (lockers), DHL, DPD, UPS | 4 | ⬜ | `ShippingProvider` — rates, labels, pickup points, tracking webhooks |
| Object storage (S3 / R2 / MinIO) | 2 | ⬜ | `ArtworkStorage` — presigned uploads |
| Malware scanning (ClamAV) | 2 | ⬜ | `UploadScanner` hook |
| AI design generation | 2+ | ⬜ | `AiDesignProvider` — optional, clearly unavailable when unset |

## Przelewy24

Modes (`P24_MODE`): `DISABLED` (default in production: checkout refuses payment), `SIMULATOR` (built-in test page at
`/dev/p24-simulator`, dev/demo only, no money), `SANDBOX`, `PRODUCTION`.

Flow: checkout → `POST /api/v1/transaction/register` (signed) → customer pays on Przelewy24 → P24 calls
`POST /api/v1/payments/p24/notify` → the shop checks the signature, amount and currency, then calls
`PUT /api/v1/transaction/verify`. **Only a verified notification marks an order PAID**; the return page just shows the
server status. Duplicate notifications are ignored; stock is committed on PAID.

Going live:
1. Create a sandbox account at przelewy24.pl and copy merchant ID, POS ID, API key ("klucz do raportów") and CRC key.
2. Set `P24_MODE=SANDBOX`, the four `P24_*` keys, `PUBLIC_API_URL` (must be reachable from the internet for the
   notification) and `PUBLIC_SITE_URL`.
3. Place a test order; check in the admin (**Orders**) that the payment events show `REGISTERED` then `VERIFIED`.
4. Test a refund from the admin order page and confirm it in the P24 panel.
5. Switch to `P24_MODE=PRODUCTION` with the production keys once P24 has activated the account.

Refunds are requested from the admin order page and stay `REFUND_PENDING` until staff confirm them, because
completion is reported in the P24 panel.

## E-mail

Order confirmations, e-mail verification and password reset links are sent through any SMTP server
(`SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `MAIL_FROM`).
Without a host the messages are written to the log only, so verification links can be read there in a demo.

## Setup outline (for when each phase lands)

1. Create sandbox credentials with the provider.
2. Put them in the secret manager / `.env` using the names in `.env.example`.
3. Register webhook URLs (`https://<api-host>/api/v1/webhooks/<provider>`) and copy the signing secret.
4. Run the provider's contract tests (`mvn verify -Pintegration-<provider>`) against the sandbox.
5. Enable the provider per market in the admin settings.

Each phase will extend this page with exact steps and screenshots.
