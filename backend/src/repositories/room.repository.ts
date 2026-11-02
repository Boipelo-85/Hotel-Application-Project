import { query } from '../config/database.js';
import type { PoolClient } from 'pg';

interface RoomInventoryRow {
  id: string;
  branch_id: string;
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
    `SELECT r.id, r.branch_id, r.capacity, r.quantity, r.price, r.currency, r.status
     FROM rooms r JOIN branches h ON h.id = r.branch_id
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
    `SELECT r.id, r.branch_id, r.capacity, r.quantity, r.price, r.currency, r.status
     FROM rooms r JOIN branches h ON h.id = r.branch_id
     WHERE r.id = $1 AND r.availability = TRUE AND r.status = 'active'
       AND h.publication_status = 'published'`,
    [roomId],
  );
}

export async function findBranchManager(
  branchId: string,
  client: PoolClient,
  lock = false,
) {
  return client.query<{
    manager_user_id: string | null;
    currency: string;
  }>(
    `SELECT h.manager_user_id, h.currency
     FROM branches h
     WHERE h.id = $1 ${lock ? 'FOR UPDATE OF h' : ''}`,
    [branchId],
  );
}

export async function findRoomForUpdate(client: PoolClient, roomId: string) {
  return client.query<{ branch_id: string; quantity: number }>(
    `SELECT r.branch_id, r.quantity FROM rooms r
     JOIN branches h ON h.id = r.branch_id
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
  branchId: string,
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
    `INSERT INTO rooms (branch_id, room_type, description, capacity, quantity, price, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     RETURNING id, branch_id, room_type, description, capacity, quantity, price, currency, status`,
    [branchId, input.roomType, input.description, input.capacity, input.quantity, input.price, input.currency],
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
     RETURNING id, branch_id, room_type, description, capacity, quantity, price, currency, status`,
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
    branch_id: string;
    room_type: string;
    description: string | null;
    capacity: number;
    quantity: number;
    price: string;
    currency: string;
    status: 'active' | 'inactive';
    availability: boolean;
    publication_status: string;
    size_sqm: number | null;
    bed_types: string | null;
    rating: number | null;
    review_count: number | null;
  }>(
    `SELECT r.id, r.branch_id, r.room_type, r.description, r.capacity, r.quantity,
            r.price, r.currency, r.status, r.availability,
            h.publication_status, r.size_sqm, r.bed_types, r.rating, r.review_count
     FROM rooms r JOIN branches h ON h.id = r.branch_id
     WHERE r.id = $1`,
    [roomId],
  );
}

export async function listRooms(branchId?: string) {
  const roomsResult = await query<{
    id: string;
    branch_id: string;
    room_type: string;
    description: string | null;
    capacity: number;
    quantity: number;
    price: string;
    currency: string;
    status: 'active' | 'inactive';
    availability: boolean;
    publication_status: string;
    size_sqm: number | null;
    bed_types: string | null;
    rating: number | null;
    review_count: number | null;
    image_url: string | null;
    image_alt_text: string | null;
  }>(
    `SELECT r.id, r.branch_id, r.room_type, r.description, r.capacity,
            r.quantity, r.price, r.currency, r.status, r.availability,
            h.publication_status,
            (SELECT ri.image_url FROM room_images ri WHERE ri.room_id = r.id ORDER BY ri.display_order LIMIT 1) as image_url,
            (SELECT ri.alt_text FROM room_images ri WHERE ri.room_id = r.id ORDER BY ri.display_order LIMIT 1) as image_alt_text
     FROM rooms r
     JOIN branches h ON h.id = r.branch_id
     WHERE ($1::BIGINT IS NULL OR r.branch_id = $1)
     ORDER BY r.price`,
    [branchId ?? null],
  );

  const rooms = roomsResult.rows;
  
  // Fetch amenities for all rooms
  const roomIds = rooms.map((r: any) => r.id);
  const amenitiesResult = await query<{
    room_id: string;
    amenity_name: string;
    category: string;
  }>(
    `SELECT room_id, amenity_name, category
     FROM room_amenities
     WHERE room_id = ANY($1)
     ORDER BY category, amenity_name`,
    [roomIds],
  );

  // Group amenities by room
  const amenitiesByRoom = amenitiesResult.rows.reduce((acc: any, amenity: any) => {
    if (!acc[amenity.room_id]) {
      acc[amenity.room_id] = [];
    }
    acc[amenity.room_id].push({
      amenity_name: amenity.amenity_name,
      category: amenity.category,
    });
    return acc;
  }, {} as Record<string, Array<{ amenity_name: string; category: string }>>);

  // Merge amenities into rooms
  return {
    rows: rooms.map((room: any) => ({
      ...room,
      amenities: amenitiesByRoom[room.id] || [],
    })),
  } as any;
}

export async function findRoomImages(roomId: string) {
  return query<{
    id: string;
    room_id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
  }>(
    `SELECT id, room_id, image_url, alt_text, display_order
     FROM room_images
     WHERE room_id = $1
     ORDER BY display_order`,
    [roomId],
  );
}

export async function findRoomAmenities(roomId: string) {
  return query<{
    id: string;
    room_id: string;
    amenity_name: string;
    category: string;
  }>(
    `SELECT id, room_id, amenity_name, category
     FROM room_amenities
     WHERE room_id = $1
     ORDER BY category, amenity_name`,
    [roomId],
  );
}
