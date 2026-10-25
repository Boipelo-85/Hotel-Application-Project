# Hotel Application

The repository contains a React frontend, a TypeScript/Express API, and PostgreSQL database scripts.

## Backend setup

1. Start PostgreSQL with Docker Compose. Set `POSTGRES_PASSWORD` in your shell first.
2. Create `backend/.env` from `backend/.env.example`, set `DATABASE_URL` to use the same database password, and use a cryptographically random `OTP_PEPPER` of at least 32 characters.
3. For a new database, run `database/schema.sql`. For a database created with the original six-table schema, apply `database/migrations/001_backend_foundation.sql` and then `database/migrations/002_soft_deletes.sql`, once each. Both migrations are additive and retain existing rows.
4. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM` in `backend/.env` with values from your email provider. If the provider requires authentication, also set `SMTP_USER` and `SMTP_PASSWORD`. Passwordless sign-in codes cannot be delivered until SMTP is configured; requests to send a code will return an explicit email-unavailable error otherwise.
5. From the repository root, install backend packages with `npm install --prefix backend`, then run `npm --prefix backend run dev`.

The API is mounted at `/api/v1`. It includes email-code authentication, profile management, hotel and room management, date-based availability, bookings, favourites, reviews, notifications, and payment integration boundaries. Controller, service, and repository modules use dotted TypeScript filenames. Services own business rules and call repositories for database operations: `auth.service.ts` handles passwordless sign-in, `user.service.ts` handles profiles, roles, and account deactivation, and `auth.repository.ts`, `session.repository.ts`, and `user.repository.ts` handle their respective persistence concerns. SQL is kept in repositories, with the shared database module providing connection and transaction infrastructure. Hotel, room, user, booking, and review deletions are handled as deactivation, cancellation, or soft deletion to preserve related records.

### Important operational notes

- Session cookies are HTTP-only, same-site, and secure in production. Mutating API calls must come from `APP_ORIGIN`.
- Passwordless sign-in sends one-time verification codes by email. Configure valid SMTP settings in `backend/.env`; the example leaves SMTP unset, so email-code requests will not work until you provide an email delivery service.
- Public registration always creates customer accounts. Promote hotel partners or establish the initial administrator through a trusted operator process, never through public registration.
- To bootstrap the first administrator, verify an account through email, then have a trusted operator update only that account's role in PostgreSQL, for example: `UPDATE users SET role = 'admin' WHERE email = LOWER(BTRIM('verified-admin@example.com'));`. Admins can promote customer accounts to hotel partners through the protected API; no public endpoint grants admin access.
- Social OAuth is not enabled; passwordless email is the active sign-in flow until a provider is explicitly selected and configured.
- Booking inventory is room-type quantity. The booking transaction locks the room row and counts confirmed plus unexpired pending bookings over the requested date range.
- A booking remains pending for 15 minutes while awaiting payment. Expired pending bookings no longer reserve inventory.
- No payment provider is installed or configured. Checkout and webhooks return an explicit unavailable response until a provider implementing `PaymentProvider` is registered; no live payment is claimed.
- Do not store card numbers or CVV data. Configure TLS and provider webhook signature verification in the provider adapter before enabling payments.

## Validation

Run `npm --prefix backend run typecheck`, `npm --prefix backend test`, and `npm --prefix backend audit`. The two reservation concurrency integration tests are skipped unless `TEST_DATABASE_URL` points to a separate database with the schema applied; those tests insert and clean up their own fixtures.
