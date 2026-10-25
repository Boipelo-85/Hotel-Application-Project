import { query } from '../config/database.js';
import type { PoolClient } from 'pg';

interface RoomInventoryRow {
  id: string;
  hotel_id: string;
  capacity: number;
  quantity: number;
  price: string;
  currency: string;
  status: 'active' | 'inactive';
}

export async function findInventoryRoom(
  client: PoolClient,
  roomId: string,
  lock: boolean,
) {
  const lockClause = lock ? 'FOR UPDATE OF r' : '';
  return client.query<RoomInventoryRow>(
    `SELECT r.id, r.hotel_id, r.capacity, r.quantity, r.price, r.currency, r.status
     FROM rooms r JOIN hotels h ON h.id = r.hotel_id
     WHERE r.id = $1 AND r.availability = TRUE AND h.publication_status = 'published' ${lockClause}`,
    [roomId],
  );
}

export async function listActiveReservations(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
  client?: PoolClient,
) {
  const execute = client ? client.query.bind(client) : query;
  return execute<{ reserved: number }>(
    `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS reserved
     FROM bookings
     WHERE room_id = $1 AND check_in < $3::DATE AND check_out > $2::DATE
       AND ($4::BIGINT IS NULL OR id <> $4)
       AND (status = 'confirmed' OR (status = 'pending' AND expires_at > CURRENT_TIMESTAMP))`,
    [roomId, checkIn, checkOut, excludeBookingId ?? null],
  );
}

export async function expireRoomBookings(client: PoolClient, roomId: string) {
  return client.query(
    `UPDATE bookings SET status = 'cancelled', expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE room_id = $1 AND status = 'pending' AND expires_at <= CURRENT_TIMESTAMP`,
    [roomId],
  );
}

export async function findAvailableRoom(roomId: string) {
  return query<RoomInventoryRow>(
    `SELECT r.id, r.hotel_id, r.capacity, r.quantity, r.price, r.currency, r.status
     FROM rooms r JOIN hotels h ON h.id = r.hotel_id
     WHERE r.id = $1 AND r.availability = TRUE AND r.status = 'active'
       AND h.publication_status = 'published'`,
    [roomId],
  );
}

export async function findHotelManager(
  hotelId: string,
  client: PoolClient,
  lock = false,
) {
  return client.query<{ partner_user_id: string | null; currency: string }>(
    `SELECT partner_user_id, currency FROM hotels WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [hotelId],
  );
}

export async function findRoomForUpdate(client: PoolClient, roomId: string) {
  return client.query<{ hotel_id: string; quantity: number }>(
    `SELECT r.hotel_id, r.quantity FROM rooms r
     JOIN hotels h ON h.id = r.hotel_id
     WHERE r.id = $1 FOR UPDATE OF r, h`,
    [roomId],
  );
}

export async function hasFutureReservations(client: PoolClient, roomId: string) {
  return client.query(
    `SELECT 1 FROM bookings
     WHERE room_id = $1 AND check_out > CURRENT_DATE
       AND (status = 'confirmed' OR (status = 'pending' AND expires_at > CURRENT_TIMESTAMP))
     LIMIT 1`,
    [roomId],
  );
}

export async function hasBookingsExceedingCapacity(
  client: PoolClient,
  roomId: string,
  capacity: number,
) {
  return client.query(
    `SELECT 1 FROM bookings
     WHERE room_id = $1 AND check_out > CURRENT_DATE
       AND (status = 'confirmed' OR (status = 'pending' AND expires_at > CURRENT_TIMESTAMP))
       AND guests > $2 * quantity
     LIMIT 1`,
    [roomId, capacity],
  );
}

export async function insertRoom(
  client: PoolClient,
  hotelId: string,
  input: {
    roomType: string;
    description: string | null;
    capacity: number;
    quantity: number;
    price: number;
    currency: string;
  },
) {
  return client.query(
    `INSERT INTO rooms (hotel_id, room_type, description, capacity, quantity, price, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     RETURNING id, hotel_id, room_type, description, capacity, quantity, price, currency, status`,
    [hotelId, input.roomType, input.description, input.capacity, input.quantity, input.price, input.currency],
  );
}

export async function updateRoomRecord(
  client: PoolClient,
  roomId: string,
  input: {
    roomType?: string;
    description?: string | null;
    capacity?: number;
    quantity?: number;
    price?: number;
    currency?: string;
    status?: 'active' | 'inactive';
  },
) {
  return client.query(
    `UPDATE rooms SET
       room_type = COALESCE($2, room_type),
       description = CASE WHEN $3::BOOLEAN THEN $4 ELSE description END,
       capacity = COALESCE($5, capacity),
       quantity = COALESCE($6, quantity),
       price = COALESCE($7, price),
       currency = COALESCE($8, currency),
       status = COALESCE($9, status),
       availability = CASE WHEN $9 = 'inactive' THEN FALSE WHEN $9 = 'active' THEN TRUE ELSE availability END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, hotel_id, room_type, description, capacity, quantity, price, currency, status`,
    [
      roomId,
      input.roomType ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.capacity ?? null,
      input.quantity ?? null,
      input.price ?? null,
      input.currency ?? null,
      input.status ?? null,
    ],
  );
}

export async function findRoomById(roomId: string) {
  return query<{
    id: string;
    hotel_id: string;
    room_type: string;
    description: string | null;
    capacity: number;
    quantity: number;
    price: string;
    currency: string;
    status: 'active' | 'inactive';
    availability: boolean;
    publication_status: string;
  }>(
    `SELECT r.id, r.hotel_id, r.room_type, r.description, r.capacity, r.quantity,
            r.price, r.currency, r.status, r.availability,
            h.publication_status
     FROM rooms r JOIN hotels h ON h.id = r.hotel_id
     WHERE r.id = $1`,
    [roomId],
  );
}

export async function listRooms(hotelId?: string) {
  return query<{
    id: string;
    hotel_id: string;
    room_type: string;
    description: string | null;
    capacity: number;
    quantity: number;
    price: string;
    currency: string;
    status: 'active' | 'inactive';
    availability: boolean;
    publication_status: string;
  }>(
    `SELECT r.id, r.hotel_id, r.room_type, r.description, r.capacity,
            r.quantity, r.price, r.currency, r.status, r.availability,
            h.publication_status
     FROM rooms r
     JOIN hotels h ON h.id = r.hotel_id
     WHERE ($1::BIGINT IS NULL OR r.hotel_id = $1)
     ORDER BY r.price`,
    [hotelId ?? null],
  );
}
