-- Seed data for Grand-Rest Hotel with 3 rooms
-- This creates one branch (hotel) with 3 rooms, images, and amenities

-- Insert a branch (hotel)
INSERT INTO branches (id, brand_id, name, city, province, address, star_rating, description, price_per_night, currency, publication_status, latitude, longitude)
VALUES (
  100,
  1,
  'Grand-Rest Hotel',
  'Pretoria',
  'Gauteng',
  '123 Main Street, Central Business District',
  5.0,
  'Experience luxury at its finest in the heart of Pretoria. Our hotel offers world-class amenities, stunning views, and exceptional service for both business and leisure travelers.',
  299.00,
  'USD',
  'published',
  -25.7479,
  28.2293
) ON CONFLICT (id) DO NOTHING;

-- Insert branch images
INSERT INTO branch_images (branch_id, image_url, alt_text, display_order)
VALUES 
  (100, '/assets/hotel_out_2-DYWiCwyA.jpg', 'Grand-Rest Hotel exterior view', 0),
  (100, '/assets/hotel_out_4-DgT8hsji.jpg', 'Grand-Rest Hotel lobby', 1),
  (100, '/assets/feature_1-DlaZq1PB.jpg', 'Grand-Rest Hotel pool area', 2)
ON CONFLICT DO NOTHING;

-- Insert branch amenities
INSERT INTO amenities (name, category)
VALUES 
  ('Swimming Pool', 'recreation'),
  ('Free WiFi', 'general'),
  ('Restaurant', 'dining'),
  ('Bar', 'dining'),
  ('Fitness Center', 'recreation'),
  ('Spa', 'recreation'),
  ('24/7 Front Desk', 'general'),
  ('Parking', 'general'),
  ('Air Conditioning', 'general'),
  ('Elevator', 'general')
ON CONFLICT (name) DO NOTHING;

INSERT INTO branch_amenities (branch_id, amenity_id)
SELECT 100, id FROM amenities WHERE name IN (
  'Swimming Pool', 'Free WiFi', 'Restaurant', 'Bar', 
  'Fitness Center', 'Spa', '24/7 Front Desk', 'Parking',
  'Air Conditioning', 'Elevator'
)
ON CONFLICT DO NOTHING;

-- Insert rooms
INSERT INTO rooms (id, branch_id, room_type, description, capacity, quantity, price, currency, status, availability)
VALUES
  (1001, 100, 'Deluxe Suite', 'Spacious suite with separate living area and stunning city views. Perfect for business travelers or couples seeking luxury.', 2, 3, 399.00, 'USD', 'active', true),
  (1002, 100, 'Ocean View Room', 'Beautiful room with panoramic ocean views and private balcony. Ideal for relaxation and enjoying the sunset.', 2, 5, 299.00, 'USD', 'active', true),
  (1003, 100, 'Standard Double', 'Comfortable and affordable room with modern amenities. Great value for solo travelers or couples.', 2, 8, 199.00, 'USD', 'active', true)
ON CONFLICT (id) DO NOTHING;
