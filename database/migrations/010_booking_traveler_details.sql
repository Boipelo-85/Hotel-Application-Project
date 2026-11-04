ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS guest_country TEXT,
    ADD COLUMN IF NOT EXISTS guest_address TEXT,
    ADD COLUMN IF NOT EXISTS special_requests TEXT;
