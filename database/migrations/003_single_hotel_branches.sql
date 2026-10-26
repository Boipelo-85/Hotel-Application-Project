-- Convert standalone hotel records into branches of one hotel brand.
-- Existing hotel records and their related data retain their IDs.
BEGIN;

CREATE TABLE hotel_brands (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    owner_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    star_rating NUMERIC(2, 1) CHECK (star_rating BETWEEN 1 AND 5),
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hotel_brands (id, owner_user_id, name, description, star_rating, contact_email, contact_phone)
SELECT 1, partner_user_id, name, description, star_rating, contact_email, contact_phone
FROM hotels
ORDER BY id
LIMIT 1;

INSERT INTO hotel_brands (id, name)
SELECT 1, 'Hotel Brand'
WHERE NOT EXISTS (SELECT 1 FROM hotel_brands);

ALTER TABLE hotels RENAME TO branches;
ALTER TABLE branches ADD COLUMN brand_id SMALLINT NOT NULL DEFAULT 1
    REFERENCES hotel_brands (id) ON DELETE RESTRICT;
ALTER TABLE branches ADD COLUMN city TEXT NOT NULL DEFAULT 'Unspecified';
ALTER TABLE branches ADD COLUMN province TEXT NOT NULL DEFAULT 'Unspecified';
CREATE INDEX branches_brand_id_idx ON branches (brand_id);
CREATE INDEX branches_city_idx ON branches (city);
CREATE INDEX branches_province_idx ON branches (province);

ALTER TABLE hotel_images RENAME TO branch_images;
ALTER TABLE branch_images RENAME COLUMN hotel_id TO branch_id;
DROP INDEX IF EXISTS hotel_images_hotel_id_idx;
CREATE INDEX branch_images_branch_id_idx ON branch_images (branch_id, display_order);

ALTER TABLE hotel_amenities RENAME TO branch_amenities;
ALTER TABLE branch_amenities RENAME COLUMN hotel_id TO branch_id;
DROP INDEX IF EXISTS hotel_amenities_amenity_id_idx;
CREATE INDEX branch_amenities_amenity_id_idx ON branch_amenities (amenity_id);

ALTER TABLE rooms RENAME COLUMN hotel_id TO branch_id;
DROP INDEX IF EXISTS rooms_hotel_id_idx;
CREATE INDEX rooms_branch_id_idx ON rooms (branch_id);

ALTER TABLE reviews RENAME COLUMN hotel_id TO branch_id;
DROP INDEX IF EXISTS reviews_hotel_id_idx;
CREATE INDEX reviews_branch_id_idx ON reviews (branch_id, created_at DESC);

ALTER TABLE favourites RENAME COLUMN hotel_id TO branch_id;
DROP INDEX IF EXISTS favourites_hotel_id_idx;
CREATE INDEX favourites_branch_id_idx ON favourites (branch_id);

COMMIT;
