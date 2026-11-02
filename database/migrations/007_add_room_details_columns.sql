-- Migration: Add room detail columns to rooms table
-- This adds size_sqm, bed_types, rating, and review_count columns

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS size_sqm NUMERIC(5, 2) CHECK (size_sqm > 0);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_types TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) CHECK (rating BETWEEN 0 AND 10);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0 CHECK (review_count >= 0);
