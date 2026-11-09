import { query } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { BookingRow } from '../types/models.js';

export async function findBookingById(bookingId: string, client?: PoolClient) {
  const execute = client ? client.query.bind(client) : query;
  return execute<BookingRow & { manager_user_id: string | null }>(
    `SELECT b.*, EXISTS (
       SELECT 1 FROM payments p
       WHERE p.booking_id = b.id AND p.status = 'successful'
         AND to_jsonb(p)->>'refund_requested_at' IS NOT NULL
     ) AS refund_pending, h.name AS branch_name, r.room_type,
           h.manager_user_id
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN branches h ON h.id = r.branch_id
     WHERE b.id = $1`,
    [bookingId],
  );
}

export async function createBookingRecord(
  client: PoolClient,
  input: {
    reference: string;
    userId: string | null;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    guestCountry?: string;
    guestAddress?: string;
    specialRequests?: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    quantity: number;
  },
) {
  return client.query<BookingRow>(
    `INSERT INTO bookings (
       booking_reference, user_id, room_id, check_in, check_out, guests, quantity,
       price_per_night_snapshot, total_amount, currency, status, expires_at,
       guest_name, guest_email, guest_phone, guest_country, guest_address, special_requests
     )
     SELECT $1, $2, r.id, $4::DATE, $5::DATE, $6, $7::INTEGER, r.price,
            r.price * $7::INTEGER * ($5::DATE - $4::DATE), r.currency,
            'pending', CURRENT_TIMESTAMP + INTERVAL '15 minutes', $8, $9, $10, $11, $12, $13
     FROM rooms r WHERE r.id = $3 RETURNING *`,
    [
      input.reference,
      input.userId,
      input.roomId,
      input.checkIn,
      input.checkOut,
      input.guests,
      input.quantity,
      input.guestName ?? null,
      input.guestEmail ?? null,
      input.guestPhone ?? null,
      input.guestCountry ?? null,
      input.guestAddress ?? null,
      input.specialRequests ?? null,
    ],
  );
}

export async function findGuestBooking(reference: string, email: string) {
  return query<BookingRow>(
    `SELECT b.*, h.name AS branch_name, r.room_type
     FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     JOIN branches h ON h.id = r.branch_id
     WHERE UPPER(b.booking_reference) = UPPER($1)
       AND LOWER(BTRIM(b.guest_email)) = LOWER(BTRIM($2))
       AND b.user_id IS NULL`,
    [reference, email],
  );
}

export async function findBranchManager(client: PoolClient, branchId: string) {
  return client.query<{ manager_user_id: string | null }>(
    `SELECT h.manager_user_id
     FROM branches h
     WHERE h.id = $1`,
    [branchId],
  );
}

export async function insertBookingNotification(
  client: PoolClient,
  userId: string,
  type: string,
  message: string,
  data: Record<string, string>,
) {
  return client.query(
    `INSERT INTO notifications (user_id, type, message, data)
     VALUES ($1, $2, $3, $4::JSONB)`,
    [userId, type, message, JSON.stringify(data)],
  );
}

export async function listUserBookings(userId: string, isAdmin: boolean) {
  return query<BookingRow>(
    `SELECT b.*, h.name AS branch_name, r.room_type
     FROM bookings b JOIN rooms r ON r.id = b.room_id
     JOIN branches h ON h.id = r.branch_id
     WHERE ($1::BOOLEAN OR b.user_id = $2)
     ORDER BY b.created_at DESC`,
    [isAdmin, userId],
  );
}

export async function listBookingsForBranch(branchId: string) {
  return query<BookingRow>(
    `SELECT b.*, h.name AS branch_name, r.room_type,
            COALESCE(u.name, b.guest_name) AS user_name,
            COALESCE(u.email, b.guest_email) AS user_email,
            u.phone AS user_phone
     FROM bookings b JOIN rooms r ON r.id = b.room_id
     JOIN branches h ON h.id = r.branch_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE h.id = $1 ORDER BY b.created_at DESC`,
    [branchId],
  );
}

export async function findBranchManagerAccess(branchId: string, userId: string) {
  return query(
    `SELECT 1 FROM branches h
     WHERE h.id = $1 AND h.manager_user_id = $2`,
    [branchId, userId],
  );
}

export async function findBookingForUpdate(client: PoolClient, bookingId: string) {
  return client.query<BookingRow>('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
}

export async function findManagerAccessToRoom(client: PoolClient, roomId: string, userId: string) {
  return client.query(
    `SELECT 1 FROM rooms r
     JOIN branches h ON h.id = r.branch_id
     WHERE r.id = $1 AND h.manager_user_id = $2`,
    [roomId, userId],
  );
}

export async function listActivePaymentsForBooking(client: PoolClient, bookingId: string) {
  return client.query<{ status: string }>(
    `SELECT status FROM payments WHERE booking_id = $1 AND status IN ('pending', 'successful')
     FOR UPDATE`,
    [bookingId],
  );
}

export async function hasActivePayment(client: PoolClient, bookingId: string) {
  return client.query(
    `SELECT 1 FROM payments WHERE booking_id = $1 AND status IN ('pending', 'successful') LIMIT 1`,
    [bookingId],
  );
}

export async function hasSuccessfulPayment(client: PoolClient, bookingId: string) {
  return client.query(
    `SELECT 1 FROM payments WHERE booking_id = $1 AND status = 'successful' LIMIT 1`,
    [bookingId],
  );
}

export async function updateBookingStatus(
  client: PoolClient,
  bookingId: string,
  status: BookingRow['status'],
) {
  return client.query<BookingRow>(
    `UPDATE bookings SET status = $2, expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [bookingId, status],
  );
}

export async function updateBookingDatesAndGuests(
  client: PoolClient,
  bookingId: string,
  input: {
    checkIn: string;
    checkOut: string;
    guests: number;
    quantity: number;
    price: string;
    currency: string;
  },
) {
  return client.query<BookingRow>(
    `UPDATE bookings SET check_in = $2::DATE, check_out = $3::DATE, guests = $4,
       quantity = $5, price_per_night_snapshot = $6,
       total_amount = $6 * $5 * ($3::DATE - $2::DATE), currency = $7,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [bookingId, input.checkIn, input.checkOut, input.guests, input.quantity, input.price, input.currency],
  );
}

export async function findBookingOwner(bookingId: string) {
  return query<{ user_id: string; role?: string }>('SELECT user_id FROM bookings WHERE id = $1', [bookingId]);
}
