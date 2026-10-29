# Hotel Application

The repository contains a React frontend, a TypeScript/Express API, and PostgreSQL database scripts.

## Backend setup

1. Start PostgreSQL with Docker Compose. Set `POSTGRES_PASSWORD` in your shell first.
2. Create `backend/.env` from `backend/.env.example`, set `DATABASE_URL` to use the same database password, and use a cryptographically random `OTP_PEPPER` of at least 32 characters.
3. For a new database, run `database/schema.sql`. For an existing database, apply `database/migrations/001_backend_foundation.sql`, `database/migrations/002_soft_deletes.sql`, `database/migrations/003_single_hotel_branches.sql`, and `database/migrations/004_branch_manager_and_single_brand.sql`, once each. The third migration converts existing hotel records into branches under one hotel brand; the fourth standardizes the singular brand table and replaces hotel-partner ownership with branch-specific manager assignments.
4. Configure authentication options:
   - **Email OTP (optional)**: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM` in `backend/.env` with values from your email provider. If the provider requires authentication, also set `SMTP_USER` and `SMTP_PASSWORD`. Passwordless sign-in codes cannot be delivered until SMTP is configured; requests to send a code will return an explicit email-unavailable error otherwise.
   - **Google OAuth (optional)**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Set `GOOGLE_CALLBACK_URL` to `http://localhost:5173/api/v1/auth/google/callback` for development.
   - **Facebook OAuth (optional)**: Set `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` from [Facebook Developer Portal](https://developers.facebook.com/apps). Set `FACEBOOK_CALLBACK_URL` to `http://localhost:5173/api/v1/auth/facebook/callback` for development.
   - **Note**: At least one authentication method (SMTP or OAuth) must be configured for users to sign in.
5. From the repository root, install backend packages with `npm install --prefix backend`, then run `npm --prefix backend run dev`.

The API is mounted at `/api/v1`. It models one hotel brand (`hotel_brand`, exposed at `/brand`) with multiple branches (`/branches`); each branch owns its rooms, availability, bookings, images, amenities, reviews, and favourites. Search uses `GET /api/v1/search?destination=Pretoria&checkIn=2026-11-01&checkOut=2026-11-03&rooms=2&guests=3`; destination matching is case-insensitive against branch city or province, dates exclude overlapping confirmed and unexpired pending reservations, and results are available branch/room-type options. Each result contains `branch`, `roomType`, `price`, and inventory/capacity details. Branch-only discovery is available at `/api/v1/branches?city=Pretoria`. Admins create branches and assign users with the `branch_manager` role through `PATCH /api/v1/branches/:branchId/manager`; managers can only manage their assigned branches. Public registration creates `customer` accounts; the supported roles are `customer`, `branch_manager`, and `admin`, with no external hotel-owner role. Rooms can be listed at `/api/v1/branches/:branchId/rooms`; booking creation requires authentication and is followed by checkout/payment and booking management endpoints. Payment remains unavailable until a provider is configured. The API also includes email-code authentication, profile management, notifications, and payment integration boundaries. Controller, service, and repository modules use dotted TypeScript filenames. Services own business rules and call repositories for database operations. SQL is kept in repositories, with the shared database module providing connection and transaction infrastructure. Branch, room, user, booking, and review deletions are handled as deactivation, cancellation, or soft deletion to preserve related records.

### Important operational notes

- Session cookies are HTTP-only, same-site, and secure in production. Mutating API calls must come from `APP_ORIGIN`.
- Authentication supports multiple methods:
  - **Email OTP**: Sends one-time verification codes by email. Configure valid SMTP settings in `backend/.env`; email-code requests will not work until you provide an email delivery service.
  - **Google OAuth**: Allows sign-in with Google accounts. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
  - **Facebook OAuth**: Allows sign-in with Facebook accounts. Configure `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` in `backend/.env`.
  - At least one authentication method must be configured for users to sign in.
- Public registration always creates customer accounts. Establish the initial administrator through a trusted operator process, never through public registration.
- To bootstrap the first administrator, verify an account through email or OAuth, then have a trusted operator update only that account's role in PostgreSQL, for example: `UPDATE users SET role = 'admin' WHERE email = LOWER(BTRIM('verified-admin@example.com'));`. Admins can promote customer accounts to `branch_manager` through the protected user-role API; no public endpoint grants admin access.
- Booking inventory is room-type quantity. The booking transaction locks the room row and counts confirmed plus unexpired pending bookings over the requested date range.
- A booking remains pending for 15 minutes while awaiting payment. Expired pending bookings no longer reserve inventory.
- No payment provider is installed or configured. Checkout and webhooks return an explicit unavailable response until a provider implementing `PaymentProvider` is registered; no live payment is claimed.
- Do not store card numbers or CVV data. Configure TLS and provider webhook signature verification in the provider adapter before enabling payments.

## Validation

Run `npm --prefix backend run typecheck`, `npm --prefix backend test`, and `npm --prefix backend audit`. The two reservation concurrency integration tests are skipped unless `TEST_DATABASE_URL` points to a separate database with the schema applied; those tests insert and clean up their own fixtures.
