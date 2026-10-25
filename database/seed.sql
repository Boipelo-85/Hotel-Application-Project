INSERT INTO amenities (name, category) VALUES
    ('Wi-Fi', 'General'),
    ('Air conditioning', 'General'),
    ('Swimming pool', 'Recreation'),
    ('Restaurant', 'Dining'),
    ('Parking', 'Transport'),
    ('Airport shuttle', 'Transport')
ON CONFLICT (name) DO NOTHING;
