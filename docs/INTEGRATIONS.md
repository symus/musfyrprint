# Integrations

**No external integration is active in Phase 1.** The platform will never report success for an integration that
is not configured: each one sits behind an interface whose default implementation answers "not configured".

| Integration | Phase | Status | Planned interface |
| --- | --- | --- | --- |
| Google / Apple / Facebook sign-in (OIDC) | 3 | ⬜ | Spring Security OAuth2 client; ID tokens verified server-side; account linking only on verified e-mail |
| Phone OTP (e.g. Twilio Verify / SMSAPI.pl) | 3 | ⬜ | `OtpProvider` — OTPs hashed, short TTL, rate-limited |
| Stripe (cards, Apple Pay, Google Pay) | 3 | ⬜ | `PaymentProvider` + `/api/v1/webhooks/stripe` (signature verified, idempotency keys) |
| PayPal | 3 | ⬜ | `PaymentProvider` |
| Przelewy24 / BLIK | 3 | ⬜ | `PaymentProvider` (P24 REST v1, CRC-signed notifications) |
| E-mail (SMTP / SES / Postmark) | 4 | ⬜ | `Notifier` — newsletter double opt-in, order mails |
| SMS | 4 | ⬜ | `Notifier` |
| InPost (lockers), DHL, DPD, UPS | 4 | ⬜ | `ShippingProvider` — rates, labels, pickup points, tracking webhooks |
| Object storage (S3 / R2 / MinIO) | 2 | ⬜ | `ArtworkStorage` — presigned uploads |
| Malware scanning (ClamAV) | 2 | ⬜ | `UploadScanner` hook |
| AI design generation | 2+ | ⬜ | `AiDesignProvider` — optional, clearly unavailable when unset |

## Setup outline (for when each phase lands)

1. Create sandbox credentials with the provider.
2. Put them in the secret manager / `.env` using the names in `.env.example`.
3. Register webhook URLs (`https://<api-host>/api/v1/webhooks/<provider>`) and copy the signing secret.
4. Run the provider's contract tests (`mvn verify -Pintegration-<provider>`) against the sandbox.
5. Enable the provider per market in the admin settings.

Each phase will extend this page with exact steps and screenshots.
