ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'card'
    CHECK (payment_method IN ('card', 'eft'));
