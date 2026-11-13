# Grand-Rest Hotel

Grand-Rest Hotel is a booking app for a hotel with multiple branches. Guests can search for available rooms and book a stay. Staff use the dashboard to manage branches, rooms, and reservations.

## Run the app locally

You’ll need Node.js 24 with npm and Docker with Docker Compose. Run these commands from the project folder.

1. Install the backend and frontend packages.

   ```sh
   npm i --prefix backend
   npm i --prefix frontend
   ```

2. Copy `backend/.env.example` to `backend/.env`. Update these settings in the copy:

   - `DATABASE_URL`: Replace `replace-me` with the PostgreSQL password you’ll use in the next step. Use a password that works in a URL or URL-encode it here.
   - `OTP_PEPPER`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`: Use a different random value of at least 32 characters for each.
   - `ADMIN_LOGIN_EMAIL` and `ADMIN_LOGIN_PASSWORD`: Set your local admin credentials. The backend sets up the configured admin account on startup.

3. Start PostgreSQL. In PowerShell, replace the example password below with the one you chose in step 2.

   ```powershell
   $env:POSTGRES_PASSWORD = 'your-local-database-password'
   docker compose up -d --wait postgres
   ```

4. Set up a **new** database and start the backend.

   ```sh
   npm --prefix backend run db -- schema
   npm --prefix backend run dev
   ```

   For an existing database, use the migration steps below in place of the schema command.

5. Open a second terminal in the project folder and start the frontend.

   ```sh
   npm --prefix frontend run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173).

To run the frontend against the deployed backend and see its published branches, set `HOTEL_API_ORIGIN=https://hotel-application-project.onrender.com` in `frontend/.env.development.local` and restart Vite. Without that setting, Vite uses the local backend on port 3000.

## Use the app

- **Book a stay.** Search by destination, travel dates, rooms, and guests. Choose an available room type and book as a guest or sign in.
- **Find your booking.** Signed-in customers can use **My Bookings**. Guests can open [Booking Lookup](http://localhost:5173/booking-lookup) and enter their booking reference and email.
- **Manage the hotel.** Sign in at [the shared login page](http://localhost:5173/login) with your admin credentials. The dashboard lets you add branches, manage rooms, and review bookings. For a fresh database, add a branch and a room type before trying the booking flow. Branch managers can manage their assigned branches.

## Optional services

- **Payments.** Set `PAYSTACK_SECRET_KEY` to a Paystack test key in `backend/.env` to try checkout. Keep the key private. For a deployed app, set `PAYSTACK_CALLBACK_URL` to the frontend payment callback and configure the Paystack webhook at `/api/v1/payments/webhook` on the HTTPS API host.
- **Email.** Configure the SMTP settings in `backend/.env` to send sign-in codes and booking emails.
- **Google and Facebook sign-in.** Add the provider credentials and register the corresponding callback URL from `backend/.env.example` with the provider.

## Update an existing database

Run database commands with a database owner connection. Use `npm --prefix backend run db -- status` to check recorded migrations. If the database already has migrations that predate the migration ledger, run `npm --prefix backend run db -- baseline <last-applied-filename>` with the last migration actually applied in order. Both migration files starting with `005_` must be applied before baselining through `006` or later.

Run `npm --prefix backend run db -- migrate` to apply pending migrations, then restore the application connection if it uses a separate account. A separate application account needs `SELECT`, `INSERT`, and `UPDATE` on `booking_email_outbox` and `USAGE` and `SELECT` on `booking_email_outbox_id_seq`.

## Run checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
## Author

- **Name:** Boipelo Harry Motileng
- **GitHub:** [github.com/boipelo](https://github.com/Boipelo-85)
- **LinkedIn:** [linkedin.com/in/boipelo](https://www.linkedin.com/in/boipelo-motileng)
