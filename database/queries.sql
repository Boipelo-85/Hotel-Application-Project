-- Availability query parameters: room id, check-in date, check-out date.
-- Pending reservations only block inventory until their expiry timestamp.
SELECT r.id AS room_id,
       r.quantity - COALESCE((
           SELECT SUM(b.quantity)
           FROM bookings b
           WHERE b.room_id = r.id
             AND b.check_in < $3::DATE
             AND b.check_out > $2::DATE
             AND (
                 b.status = 'confirmed'
                 OR (b.status = 'pending' AND b.expires_at > CURRENT_TIMESTAMP)
             )
       ), 0) AS available_units
FROM rooms r
WHERE r.id = $1
  AND r.status = 'active'
  AND r.availability = TRUE;

-- User booking history. Supply the authenticated user id.
SELECT b.*, h.name AS hotel_name, r.room_type
FROM bookings b
JOIN rooms r ON r.id = b.room_id
JOIN hotels h ON h.id = r.hotel_id
WHERE b.user_id = $1
ORDER BY b.created_at DESC;
