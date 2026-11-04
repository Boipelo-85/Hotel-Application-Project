ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS guest_name TEXT,
    ADD COLUMN IF NOT EXISTS guest_email TEXT,
    ADD COLUMN IF NOT EXISTS guest_phone TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_guest_contact_required'
    ) THEN
        ALTER TABLE bookings
            ADD CONSTRAINT bookings_guest_contact_required
            CHECK (
                user_id IS NOT NULL
                OR (guest_name IS NOT NULL AND guest_email IS NOT NULL)
            ) NOT VALID;
    END IF;
END $$;
