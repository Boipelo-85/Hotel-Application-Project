import type { PoolClient } from 'pg';

export async function enqueueBookingEmail(client: PoolClient, bookingId: string, kind: 'confirmed' | 'cancelled') {
  // Older deployments can still record payments before the email migration is applied.
  const { rows } = await client.query<{ available: boolean }>(
    "SELECT to_regclass('booking_email_outbox') IS NOT NULL AS available",
  );
  if (!rows[0]?.available) {
    console.warn('Booking email skipped because migration 013 has not been applied');
    return;
  }
  return client.query(
    `INSERT INTO booking_email_outbox (booking_id, kind, recipient, subject, body)
     SELECT b.id, $2, COALESCE(u.email, b.guest_email),
       'Your hotel booking ' || b.booking_reference || ' is ' || $2,
       'Booking ' || b.booking_reference || E'\nStatus: ' || $2 ||
       E'\nBranch: ' || h.name || E'\nRoom: ' || r.room_type ||
       E'\nCheck-in: ' || b.check_in::TEXT || E'\nCheck-out: ' || b.check_out::TEXT ||
       E'\nRooms: ' || b.quantity::TEXT || E'\nGuests: ' || b.guests::TEXT ||
       E'\nTotal: ' || b.currency || ' ' || b.total_amount::TEXT ||
       E'\nKeep your booking reference and email to manage your reservation on our website.'
     FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN branches h ON h.id = r.branch_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.id = $1 AND COALESCE(u.email, b.guest_email) IS NOT NULL
     ON CONFLICT (booking_id, kind) DO NOTHING`, [bookingId, kind],
  );
}

export function nextBookingEmail(client: PoolClient) {
  return client.query<{ id: string; recipient: string; subject: string; body: string }>(
    `SELECT id, recipient, subject, body FROM booking_email_outbox
     WHERE sent_at IS NULL AND next_attempt_at <= CURRENT_TIMESTAMP
     ORDER BY next_attempt_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
  );
}

export function finishBookingEmail(client: PoolClient, id: string, sent: boolean) {
  return client.query(
    `UPDATE booking_email_outbox SET attempts = attempts + 1,
       sent_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
       next_attempt_at = CURRENT_TIMESTAMP + LEAST(3600, 60 * POWER(2, LEAST(attempts, 6))) * INTERVAL '1 second'
     WHERE id = $1`, [id, sent],
  );
}
