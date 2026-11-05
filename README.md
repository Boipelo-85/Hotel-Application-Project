# Hotel Application

The repository contains a React frontend, a TypeScript/Express API, and PostgreSQL database scripts.

## Backend setup

1. Start PostgreSQL with Docker Compose. Set `POSTGRES_PASSWORD` in your shell first.
2. Create `backend/.env` from `backend/.env.example`, set `DATABASE_URL` to use the same database password, and replace `OTP_PEPPER`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` with separate cryptographically random values of at least 32 characters each.
3. For a new database, run `npm --prefix backend run db -- schema` using a database owner account. For an existing database that has already applied migrations 001–012, first record that history with `npm --prefix backend run db -- baseline 012_payment_method_selection.sql`, then run `npm --prefix backend run db -- migrate` to apply 013 and 014. If the database is older, baseline only through the last file actually applied. Both 005 migrations must have been applied before baselining through 006 or later. Use an owner connection for migration commands, then restore the restricted application connection. The ledger records filenames and checksums, skips applied migrations, detects changed files, and serializes migration runs. `npm --prefix backend run db -- status` shows recorded history. Never baseline unapplied migrations.
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
- Guests can create a reservation, pay by card or EFT, and manage or cancel it without an account. Creation and successful reference/email lookup issue a 24-hour HTTP-only cookie bound to that reservation. Unpaid bookings can be cancelled unless a payment is in progress. Paid guest stays can be cancelled before check-in for a full refund; they remain confirmed until a signed refund event arrives. Refund requests are claimed once before contacting the provider; ambiguous failures require staff reconciliation rather than automatically retrying a charge reversal. Confirmation and cancellation emails are queued transactionally and retried when SMTP is configured. Only pending, unexpired bookings can be modified.
- Do not store card numbers or CVV data. The Paystack adapter verifies webhook signatures against the raw request body; use TLS for production.

## Validation

Run `npm --prefix backend run typecheck`, `npm --prefix backend test`, and `npm --prefix backend audit`. Database integration tests are skipped unless `TEST_DATABASE_URL` points to a separate database with the schema applied; those tests insert and clean up their own fixtures. Alternatively, `npm --prefix backend run test:integration` creates a temporary isolated schema, applies the current schema, runs the database tests, and removes only that temporary schema afterward. Its database account must have permission to create schemas.

### Authentication behaviour

Password registration creates an unverified customer account. Successful email-code verification proves email ownership; SMTP must be configured for delivery. Existing verification flags are preserved because historical password and verified accounts cannot reliably be distinguished automatically.

Google and Facebook sign-in use JWT cookies without Passport server sessions. Each redirect includes a random state bound to a short-lived HTTP-only browser cookie, and callbacks with missing or mismatched state are rejected. Google sign-in requires a verified provider email. OAuth does not automatically link an existing account by matching its email: use that account's original sign-in method. An authenticated account-linking flow is not currently implemented.

The former simple backend now uses compatibility entry points into the supported API. The duplicate routes, controllers, repositories, and alternate schema have been removed.

### One shared sign-in page

Use `/login` for customers and staff. The configured administrator signs in with `ADMIN_LOGIN_EMAIL` and `ADMIN_LOGIN_PASSWORD`; `seedAdminUser()` and the administrator row remain unchanged. The shared login endpoint checks that email before regular password authentication, rejects incorrect administrator passwords with the generic login error, and creates a cryptographically random session with only its hash stored in `auth_sessions`. Regular password accounts retain their existing JWT login flow.

Access cookies are backed by hashed `auth_sessions` records. Every request reads the current role and active-account state; logout and logout-all revoke stored sessions immediately. Previously issued JWT cookies require a fresh sign-in after this update.

Admins and branch managers are sent to `/admin`. Customers return to their requested page or the home page. `/admin/login` redirects to `/login`, and the former `POST /api/v1/admin/login` endpoint has been removed. Public registration rejects the configured administrator email. All staff API routes require authentication and a staff role; user-management actions additionally require an administrator.

For frontend navigation checks, run `npm --prefix frontend run build` first, then `npm --prefix frontend run test:navigation`. The browser tests use the production preview with sample API responses; they do not modify a live database or initiate real payments.

Frontend pages are loaded on demand. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from the root. Booking email delivery requires SMTP_HOST and SMTP_FROM, plus SMTP_USER/SMTP_PASSWORD only when the SMTP service requires authentication. Migrations 013 and 014 must be applied before starting this version. Image uploads are decoded, size-limited, stripped of metadata, and stored as WebP.

When migrations run under a different owner than the application account, grant that account SELECT/INSERT/UPDATE on booking_email_outbox and USAGE/SELECT on booking_email_outbox_id_seq. Refund requests with an uncertain provider outcome remain claimed; hotel staff must reconcile them in the payment dashboard before any retry.
