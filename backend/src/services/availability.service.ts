import type { PoolClient } from 'pg';
import { findAvailableRoom, findInventoryRoom, listActiveReservations, expireRoomBookings } from '../repositories/room.repository.js';
import { AppError } from '../utils/errors.js';

export interface RoomInventory {
  id: string;
  hotel_id: string;
  capacity: number;
  quantity: number;
  price: string;
  currency: string;
  status: 'active' | 'inactive';
}

export interface AvailabilityResult {
  roomId: string;
  capacity: number;
  inventory: number;
  reserved: number;
  available: number;
  pricePerNight: string;
  currency: string;
  isAvailable: boolean;
  canAccommodateGuests: (guests: number, units: number) => boolean;
}

export function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString().slice(0, 10) !== checkIn ||
    end.toISOString().slice(0, 10) !== checkOut ||
    end <= start
  ) {
    throw new AppError(400, 'Check-out must be later than check-in using valid calendar dates', 'INVALID_DATES');
  }
  return (end.getTime() - start.getTime()) / 86_400_000;
}

export async function getRoomInventory(
  client: PoolClient,
  roomId: string,
  checkIn: string,
  checkOut: string,
  lockRoom = false,
  excludeBookingId?: string,
): Promise<{ room: RoomInventory; reserved: number }> {
  countNights(checkIn, checkOut);
  const roomResult = await findInventoryRoom(client, roomId, lockRoom);
  const room = roomResult.rows[0];
  if (!room || room.status !== 'active') {
    throw new AppError(404, 'Room type is not available', 'ROOM_NOT_FOUND');
  }
  if (lockRoom) await expireRoomBookings(client as PoolClient, roomId);
  const reservationResult = await listActiveReservations(roomId, checkIn, checkOut, excludeBookingId, client);
  return { room, reserved: reservationResult.rows[0].reserved };
}

export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string,
  requestedUnits = 1,
): Promise<AvailabilityResult> {
  countNights(checkIn, checkOut);
  const roomResult = await findAvailableRoom(roomId);
  const room = roomResult.rows[0];
  if (!room) throw new AppError(404, 'Room type is not available', 'ROOM_NOT_FOUND');
  const reservations = await listActiveReservations(roomId, checkIn, checkOut);
  const reserved = reservations.rows[0].reserved;
  const available = Math.max(room.quantity - reserved, 0);
  if (!Number.isSafeInteger(requestedUnits) || requestedUnits < 1) {
    throw new AppError(400, 'Requested quantity must be a positive integer', 'INVALID_QUANTITY');
  }
  return {
    roomId: room.id,
    capacity: room.capacity,
    inventory: room.quantity,
    reserved,
    available,
    pricePerNight: room.price,
    currency: room.currency,
    isAvailable: available >= requestedUnits,
    canAccommodateGuests: (guests, units) =>
      Number.isSafeInteger(guests) && guests > 0 && Number.isSafeInteger(units) &&
      units > 0 && guests <= room.capacity * units,
  };
}
