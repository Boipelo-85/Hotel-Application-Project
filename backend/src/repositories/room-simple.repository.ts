import { query } from '../config/database.js';
import type { RoomRow, RoomInput } from '../types/models.js';

export async function createRoom(room: RoomInput): Promise<RoomRow> {
  const result = await query<RoomRow>(
    'INSERT INTO rooms (branch_id, room_type, description, capacity, quantity_available, price_per_night, currency) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [1, room.roomType || 'standard', room.description || null, room.capacity || 2, room.quantityAvailable || 1, room.pricePerNight || 100, room.currency || 'USD']
  );
  return result.rows[0];
}

export async function findRoomById(roomId: number): Promise<RoomRow | null> {
  const result = await query<RoomRow>('SELECT * FROM rooms WHERE id = $1', [roomId]);
  return result.rows[0] || null;
}

export async function findAllRooms(): Promise<RoomRow[]> {
  const result = await query<RoomRow>('SELECT * FROM rooms');
  return result.rows;
}

export async function updateRoom(roomId: number, updates: Partial<RoomInput>): Promise<RoomRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.roomType !== undefined) {
    fields.push(`room_type = $${paramIndex++}`);
    values.push(updates.roomType);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.capacity !== undefined) {
    fields.push(`capacity = $${paramIndex++}`);
    values.push(updates.capacity);
  }
  if (updates.quantityAvailable !== undefined) {
    fields.push(`quantity_available = $${paramIndex++}`);
    values.push(updates.quantityAvailable);
  }
  if (updates.pricePerNight !== undefined) {
    fields.push(`price_per_night = $${paramIndex++}`);
    values.push(updates.pricePerNight);
  }
  if (updates.currency !== undefined) {
    fields.push(`currency = $${paramIndex++}`);
    values.push(updates.currency);
  }

  if (fields.length === 0) return null;

  values.push(roomId);
  const result = await query<RoomRow>(
    `UPDATE rooms SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteRoom(roomId: number): Promise<boolean> {
  const result = await query('DELETE FROM rooms WHERE id = $1', [roomId]);
  return (result.rowCount || 0) > 0;
}
