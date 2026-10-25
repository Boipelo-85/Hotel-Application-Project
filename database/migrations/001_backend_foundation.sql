-- Additive upgrade for databases created with the original six-table schema.
-- This migration does not drop tables or delete application data.
BEGIN;

ALTER TABLE users ALTER COLUMN name SET DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'customer' WHERE role = 'user';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer';
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'hotel_partner', 'admin'));
DROP INDEX IF EXISTS users_email_lower_unique;
UPDATE users SET email = LOWER(BTRIM(email));
ALTER TABLE users ADD CONSTRAINT users_email_normalized_check CHECK (email = LOWER(BTRIM(email)));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique ON users (LOWER(BTRIM(email)));

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS partner_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS policies JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hotels ALTER COLUMN publication_status SET DEFAULT 'draft';
ALTER TABLE hotels ADD CONSTRAINT hotels_publication_status_check
    CHECK (publication_status IN ('draft', 'pending_review', 'published', 'rejected'));
ALTER TABLE hotels ADD CONSTRAINT hotels_currency_check CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE hotels ADD CONSTRAINT hotels_latitude_check CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE hotels ADD CONSTRAINT hotels_longitude_check CHECK (longitude BETWEEN -180 AND 180);
CREATE INDEX IF NOT EXISTS hotels_publication_status_idx ON hotels (publication_status);
CREATE INDEX IF NOT EXISTS hotels_partner_user_id_idx ON hotels (partner_user_id);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD CONSTRAINT rooms_quantity_check CHECK (quantity > 0);
ALTER TABLE rooms ADD CONSTRAINT rooms_currency_check CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('active', 'inactive'));
CREATE INDEX IF NOT EXISTS rooms_hotel_id_idx ON rooms (hotel_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_per_night_snapshot NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE bookings
SET booking_reference = 'HB-' || UPPER(SUBSTRING(MD5(id::TEXT || ':' || created_at::TEXT) FROM 1 FOR 12))
WHERE booking_reference IS NULL;
UPDATE bookings b
SET price_per_night_snapshot = r.price,
    total_amount = r.price * b.quantity * (b.check_out - b.check_in),
    currency = r.currency
FROM rooms r
WHERE r.id = b.room_id
  AND (b.price_per_night_snapshot IS NULL OR b.total_amount IS NULL OR b.currency IS NULL);
UPDATE bookings SET expires_at = created_at + INTERVAL '15 minutes'
WHERE status = 'pending' AND expires_at IS NULL;
ALTER TABLE bookings ALTER COLUMN booking_reference SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN price_per_night_snapshot SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN total_amount SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN currency SET NOT NULL;
ALTER TABLE bookings ADD CONSTRAINT bookings_quantity_check CHECK (quantity > 0);
ALTER TABLE bookings ADD CONSTRAINT bookings_price_snapshot_check CHECK (price_per_night_snapshot >= 0);
ALTER TABLE bookings ADD CONSTRAINT bookings_total_amount_check CHECK (total_amount >= 0);
ALTER TABLE bookings ADD CONSTRAINT bookings_currency_check CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE bookings ADD CONSTRAINT bookings_pending_expiry_check
    CHECK (status <> 'pending' OR expires_at IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_reference_unique ON bookings (booking_reference);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_room_dates_idx ON bookings (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS bookings_pending_expiry_idx ON bookings (expires_at) WHERE status = 'pending';

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES bookings (id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS reviews_hotel_id_idx ON reviews (hotel_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_id_unique
    ON reviews (booking_id) WHERE booking_id IS NOT NULL;

ALTER TABLE favourites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS favourites_user_id_idx ON favourites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS favourites_hotel_id_idx ON favourites (hotel_id);

CREATE TABLE IF NOT EXISTS hotel_images (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    hotel_id BIGINT NOT NULL REFERENCES hotels (id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS hotel_images_hotel_id_idx ON hotel_images (hotel_id, display_order);

CREATE TABLE IF NOT EXISTS amenities (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT
);
CREATE TABLE IF NOT EXISTS hotel_amenities (
    hotel_id BIGINT NOT NULL REFERENCES hotels (id) ON DELETE CASCADE,
    amenity_id BIGINT NOT NULL REFERENCES amenities (id) ON DELETE RESTRICT,
    PRIMARY KEY (hotel_id, amenity_id)
);
CREATE INDEX IF NOT EXISTS hotel_amenities_amenity_id_idx ON hotel_amenities (amenity_id);

CREATE TABLE IF NOT EXISTS auth_codes (
    email TEXT PRIMARY KEY,
    code_hash BYTEA NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash BYTEA PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (expires_at);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key_hash BYTEA PRIMARY KEY,
    window_started_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    provider_transaction_reference TEXT,
    checkout_url TEXT,
    refund_idempotency_key TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_transaction_reference)
);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments (booking_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_per_booking_idx
    ON payments (booking_id) WHERE status IN ('pending', 'successful');
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_refund_idempotency_unique
    ON payments (refund_idempotency_key) WHERE refund_idempotency_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS payment_events (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    payment_id BIGINT REFERENCES payments (id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

COMMIT;
