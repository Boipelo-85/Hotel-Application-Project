# Hotel Application

The repository contains a React frontend, a TypeScript/Express API, and PostgreSQL database scripts.

## Backend setup

1. Start PostgreSQL with Docker Compose. Set `POSTGRES_PASSWORD` in your shell first.
2. Create `backend/.env` from `backend/.env.example`, set `DATABASE_URL` to use the same database password, and replace `OTP_PEPPER`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` with separate cryptographically random values of at least 32 characters each.
3. For a new database, run `database/schema.sql`. For an existing database, apply every migration in `database/migrations` in filename order, once each, through `012_payment_method_selection.sql`. Migrations 001-004 establish branches under one hotel brand and branch-specific manager assignments. Migration `005_guest_bookings.sql` allows guest bookings; `005_room_images.sql` creates the room-image table, which migration 006 also creates idempotently while adding room amenities. Migration 007 adds room-detail columns; migration 008 adds password/OAuth authentication; migration 009 stores guest contact details for guest booking lookup; migration 010 stores traveler country, address, and special requests with a booking; migration 011 removes an obsolete password-or-OAuth constraint left by earlier versions of migration 008; migration 012 records the selected card or EFT payment method. Both 005 files share a numeric prefix, so apply both before 006 as listed by filename. Run migrations using a database owner role, not the restricted application role.
4. Configure authentication options as needed:
   - **Email OTP (optional)**: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM` in `backend/.env` with values from your email provider. If the provider requires authentication, also set `SMTP_USER` and `SMTP_PASSWORD`. Passwordless sign-in codes cannot be delivered until SMTP is configured; requests to send a code will return an explicit email-unavailable error otherwise.
   - **Google OAuth (optional)**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Set `GOOGLE_CALLBACK_URL` to `http://localhost:5173/api/v1/auth/google/callback` for development.
   - **Facebook OAuth (optional)**: Set `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` from [Facebook Developer Portal](https://developers.facebook.com/apps). Set `FACEBOOK_CALLBACK_URL` to `http://localhost:5173/api/v1/auth/facebook/callback` for development.
5. To enable Paystack test checkout, set `PAYSTACK_SECRET_KEY` in `backend/.env` to the secret test key from the Paystack dashboard (`sk_test_...`). Do not put this key in frontend code, commit it, or share it. The default `PAYSTACK_CALLBACK_URL` is `http://localhost:5173/payment/callback`; set it to the frontend callback URL for your deployment. Use a test payment method supported for the account and currency being tested. Do not configure a live key until you are ready to accept real payments.
6. From the repository root, install backend packages with `npm install --prefix backend`, then run `npm --prefix backend run dev`.

The API is mounted at `/api/v1`. It models one hotel brand (`hotel_brand`, exposed at `/brand`) with multiple branches (`/branches`); each branch owns its rooms, availability, bookings, images, amenities, reviews, and favourites. Search uses `GET /api/v1/search?destination=Pretoria&checkIn=2026-11-01&checkOut=2026-11-03&rooms=2&guests=3`; destination matching is case-insensitive against branch city or province, dates exclude overlapping confirmed and unexpired pending reservations, and results are available branch/room-type options. Each result contains `branch`, `roomType`, `price`, and inventory/capacity details. Branch-only discovery is available at `/api/v1/branches?city=Pretoria`. Admins create branches and assign users with the `branch_manager` role through `PATCH /api/v1/branches/:branchId/manager`; managers can only manage their assigned branches. Public registration creates `customer` accounts; the supported roles are `customer`, `branch_manager`, and `admin`, with no external hotel-owner role. Booking creation supports authenticated users and guest checkout; guests must provide a name and email and can retrieve their booking through `POST /api/v1/bookings/lookup` using their reference and email. Payment remains unavailable until a provider is configured. The API also includes email-code authentication, profile management, notifications, and payment integration boundaries. Controller, service, and repository modules use dotted TypeScript filenames. Services own business rules and call repositories for database operations. SQL is kept in repositories, with the shared database module providing connection and transaction infrastructure. Branch, room, user, booking, and review deletions are handled as deactivation, cancellation, or soft deletion to preserve related records.

### Important operational notes

- Session cookies are HTTP-only, same-site, and secure in production. Mutating API calls must come from `APP_ORIGIN`.
- Account creation requires migration 008 on existing databases. If it is missing, registration reports that the database schema must be updated; apply `database/migrations/008_add_password_hash.sql` as the owner of the `users` table.
- Authentication supports multiple methods:
  - **Email/password**: Registration and sign-in work without an external authentication provider.
  - **Email OTP**: Sends one-time verification codes by email. Configure valid SMTP settings in `backend/.env`; email-code requests will not work until you provide an email delivery service.
  - **Google OAuth**: Allows sign-in with Google accounts. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
  - **Facebook OAuth**: Allows sign-in with Facebook accounts. Configure `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` in `backend/.env`.
- Public registration always creates customer accounts. Establish the initial administrator through a trusted operator process, never through public registration.
- To bootstrap the first administrator, verify an account through email or OAuth, then have a trusted operator update only that account's role in PostgreSQL, for example: `UPDATE users SET role = 'admin' WHERE email = LOWER(BTRIM('verified-admin@example.com'));`. Admins can promote customer accounts to `branch_manager` through the protected user-role API; no public endpoint grants admin access.
- Booking inventory is room-type quantity. The booking transaction locks the room row and counts confirmed plus unexpired pending bookings over the requested date range.
- A booking remains pending for 15 minutes while awaiting payment. Expired pending bookings no longer reserve inventory.
- If `PAYSTACK_SECRET_KEY` is absent, payment checkout and webhooks return an explicit unavailable response. With a key configured, the backend initializes Paystack hosted checkout, and confirms a booking only after server-side transaction verification or a valid signed webhook.
- For deployed webhooks, configure Paystack to send events to `https://<your-api-origin>/api/v1/payments/webhook`. The webhook must be reachable over HTTPS; the browser callback also verifies directly with Paystack, so local checkout testing does not depend on a public webhook endpoint.
- Guest bookings can be looked up by reference and email, but online guest payment, booking confirmation emails, and policy-based cancellation rules are not implemented. SMTP configuration currently supports authentication emails only. Only pending, unexpired bookings can be modified; confirmed booking changes require an implemented branch policy flow.
- Do not store card numbers or CVV data. The Paystack adapter verifies webhook signatures against the raw request body; use TLS for production.

## Validation

Run `npm --prefix backend run typecheck`, `npm --prefix backend test`, and `npm --prefix backend audit`. The two reservation concurrency integration tests are skipped unless `TEST_DATABASE_URL` points to a separate database with the schema applied; those tests insert and clean up their own fixtures.

### Authentication behaviour

Password registration creates an unverified customer account. Successful email-code verification proves email ownership; SMTP must be configured for delivery. Existing verification flags are preserved because historical password and verified accounts cannot reliably be distinguished automatically.

Google and Facebook sign-in use JWT cookies without Passport server sessions. Each redirect includes a random state bound to a short-lived HTTP-only browser cookie, and callbacks with missing or mismatched state are rejected. Google sign-in requires a verified provider email. OAuth does not automatically link an existing account by matching its email: use that account's original sign-in method. An authenticated account-linking flow is not currently implemented.

The alternate simple registration endpoint also always creates customers, regardless of a role supplied in the request.
