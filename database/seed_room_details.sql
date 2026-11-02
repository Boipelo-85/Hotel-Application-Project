-- Seed data for room details enhancement
-- Adds images and amenities for 3 rooms to Grand-Rest Hotel
-- Note: This assumes rooms with IDs 1, 2, and 3 already exist in the database

-- Insert room images for Deluxe Double Room (id=1)
INSERT INTO room_images (room_id, image_url, alt_text, display_order) VALUES
    (1, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'Deluxe room with ocean view', 0),
    (1, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'King-size bed with luxury linens', 1),
    (1, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', 'Private bathroom with bathtub', 2),
    (1, 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800', 'Private balcony with sea view', 3)
ON CONFLICT DO NOTHING;

-- Insert room images for Family Suite (id=2)
INSERT INTO room_images (room_id, image_url, alt_text, display_order) VALUES
    (2, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800', 'Family suite living area', 0),
    (2, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'Master bedroom with king bed', 1),
    (2, 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800', 'Second bedroom with twin beds', 2),
    (2, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', 'Kitchenette and dining area', 3)
ON CONFLICT DO NOTHING;

-- Insert room images for Executive Suite (id=3)
INSERT INTO room_images (room_id, image_url, alt_text, display_order) VALUES
    (3, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 'Executive suite panoramic view', 0),
    (3, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 'Luxury bedroom with jacuzzi', 1),
    (3, 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800', 'Private terrace with outdoor seating', 2),
    (3, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', 'VIP lounge area', 3)
ON CONFLICT DO NOTHING;

-- Insert room amenities for Deluxe Double Room (id=1)
INSERT INTO room_amenities (room_id, amenity_name, category) VALUES
    (1, 'Free toiletries', 'bathroom'),
    (1, 'Shower', 'bathroom'),
    (1, 'Bathtub', 'bathroom'),
    (1, 'Toilet', 'bathroom'),
    (1, 'Towels', 'bathroom'),
    (1, 'Hairdryer', 'bathroom'),
    (1, 'Toilet paper', 'bathroom'),
    (1, 'Ocean view', 'view'),
    (1, 'Balcony', 'facilities'),
    (1, 'Air conditioning', 'facilities'),
    (1, 'Safety deposit box', 'facilities'),
    (1, 'Linens', 'facilities'),
    (1, 'Tile/marble floor', 'facilities'),
    (1, 'Desk', 'facilities'),
    (1, 'Flat-screen TV', 'facilities'),
    (1, 'Refrigerator', 'facilities'),
    (1, 'Telephone', 'facilities'),
    (1, 'Tea/Coffee maker', 'facilities'),
    (1, 'Electric kettle', 'facilities'),
    (1, 'Wardrobe or closet', 'facilities'),
    (1, 'Free Wifi', 'general')
ON CONFLICT DO NOTHING;

-- Insert room amenities for Family Suite (id=2)
INSERT INTO room_amenities (room_id, amenity_name, category) VALUES
    (2, 'Free toiletries', 'bathroom'),
    (2, 'Shower', 'bathroom'),
    (2, 'Bathtub', 'bathroom'),
    (2, 'Toilet', 'bathroom'),
    (2, 'Towels', 'bathroom'),
    (2, 'Hairdryer', 'bathroom'),
    (2, 'Toilet paper', 'bathroom'),
    (2, 'Ocean view', 'view'),
    (2, 'Balcony', 'facilities'),
    (2, 'Air conditioning', 'facilities'),
    (2, 'Safety deposit box', 'facilities'),
    (2, 'Linens', 'facilities'),
    (2, 'Tile/marble floor', 'facilities'),
    (2, 'Desk', 'facilities'),
    (2, 'Flat-screen TV', 'facilities'),
    (2, 'Refrigerator', 'facilities'),
    (2, 'Telephone', 'facilities'),
    (2, 'Tea/Coffee maker', 'facilities'),
    (2, 'Electric kettle', 'facilities'),
    (2, 'Wardrobe or closet', 'facilities'),
    (2, 'Kitchenette', 'facilities'),
    (2, 'Dining table', 'facilities'),
    (2, 'Sofa bed', 'bedding'),
    (2, 'Free Wifi', 'general')
ON CONFLICT DO NOTHING;

-- Insert room amenities for Executive Suite (id=3)
INSERT INTO room_amenities (room_id, amenity_name, category) VALUES
    (3, 'Free toiletries', 'bathroom'),
    (3, 'Shower', 'bathroom'),
    (3, 'Bathtub', 'bathroom'),
    (3, 'Jacuzzi', 'bathroom'),
    (3, 'Toilet', 'bathroom'),
    (3, 'Towels', 'bathroom'),
    (3, 'Slippers', 'bathroom'),
    (3, 'Hairdryer', 'bathroom'),
    (3, 'Toilet paper', 'bathroom'),
    (3, 'Ocean view', 'view'),
    (3, 'Panoramic view', 'view'),
    (3, 'Balcony', 'facilities'),
    (3, 'Private terrace', 'facilities'),
    (3, 'Air conditioning', 'facilities'),
    (3, 'Safety deposit box', 'facilities'),
    (3, 'Linens', 'facilities'),
    (3, 'Tile/marble floor', 'facilities'),
    (3, 'Desk', 'facilities'),
    (3, 'Flat-screen TV', 'facilities'),
    (3, 'Refrigerator', 'facilities'),
    (3, 'Telephone', 'facilities'),
    (3, 'Tea/Coffee maker', 'facilities'),
    (3, 'Electric kettle', 'facilities'),
    (3, 'Wardrobe or closet', 'facilities'),
    (3, 'Mini bar', 'facilities'),
    (3, 'King-size bed', 'bedding'),
    (3, 'Queen bed', 'bedding'),
    (3, 'Free Wifi', 'general'),
    (3, 'VIP services', 'general')
ON CONFLICT DO NOTHING;
