INSERT INTO amenities (name, category) VALUES
    ('Wi-Fi', 'General'),
    ('Air conditioning', 'General'),
    ('Swimming pool', 'Recreation'),
    ('Restaurant', 'Dining'),
    ('Parking', 'Transport'),
    ('Airport shuttle', 'Transport')
ON CONFLICT (name) DO NOTHING;

-- Insert a sample hotel (branch)
INSERT INTO branches (id, brand_id, name, city, province, address, star_rating, description, price_per_night, currency, contact_email, contact_phone, latitude, longitude, publication_status)
VALUES (
    1,
    1,
    'Grand-Rest Hotel',
    'Cape Town',
    'Western Cape',
    '123 Beach Road, Camps Bay',
    4.5,
    'Luxury beachfront hotel with stunning ocean views and world-class amenities. Perfect for both business and leisure travelers seeking an unforgettable experience.',
    2500.00,
    'ZAR',
    'info@grandresthotel.co.za',
    '+27 21 123 4567',
    -33.9519,
    18.3834,
    'published'
)
ON CONFLICT (id) DO NOTHING;

-- Insert branch images
INSERT INTO branch_images (branch_id, image_url, alt_text, display_order)
VALUES
    (1, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'Hotel exterior view', 0),
    (1, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'Luxury room interior', 1),
    (1, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'Hotel swimming pool', 2),
    (1, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', 'Hotel restaurant', 3)
ON CONFLICT DO NOTHING;

-- Assign amenities to the hotel
INSERT INTO branch_amenities (branch_id, amenity_id)
SELECT 1, id FROM amenities WHERE name IN ('Wi-Fi', 'Air conditioning', 'Swimming pool', 'Restaurant', 'Parking')
ON CONFLICT DO NOTHING;

-- Insert 3 rooms for the hotel
INSERT INTO rooms (id, branch_id, room_type, description, capacity, quantity, price, currency, status, availability)
VALUES
    (1, 1, 'Deluxe Double Room', 'Spacious room with king-size bed, ocean view, private balcony, and modern amenities. Perfect for couples seeking relaxation.', 2, 5, 2500.00, 'ZAR', 'active', true),
    (2, 1, 'Family Suite', 'Large suite with separate living area, two bedrooms, kitchenette, and stunning sea views. Ideal for families or groups.', 4, 3, 4500.00, 'ZAR', 'active', true),
    (3, 1, 'Executive Suite', 'Premium suite with panoramic ocean views, private terrace, jacuzzi, and exclusive VIP services. The ultimate luxury experience.', 2, 2, 6500.00, 'ZAR', 'active', true)
ON CONFLICT (id) DO NOTHING;
