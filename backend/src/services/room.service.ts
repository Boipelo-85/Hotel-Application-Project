import { inTransaction } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import {
  findBranchManager,
  findRoomById,
  findRoomForUpdate,
  hasBookingsExceedingCapacity,
  hasFutureReservations,
  insertRoom,
  listRooms as selectRooms,
  updateRoomRecord,
} from '../repositories/room.repository.js';

export interface RoomInput {
  roomType?: string;
  description?: string | null;
  capacity?: number;
  quantity?: number;
  price?: number;
  currency?: string;
  status?: 'active' | 'inactive';
}

async function assertCanManageBranch(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  client: PoolClient,
  lock = false,
): Promise<{ currency: string }> {
  const result = await findBranchManager(branchId, client, lock);
  if (!result.rows[0]) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  if (
    user.role !== 'admin' &&
    result.rows[0].manager_user_id !== user.id
  ) {
    throw new AppError(403, 'You cannot manage this branch', 'FORBIDDEN');
  }
  return { currency: result.rows[0].currency };
}

export async function listRooms(branchId?: string): Promise<unknown[]> {
  const result = await selectRooms(branchId);
  return result.rows.filter(
    (room) => room.status === 'active' && room.availability && room.publication_status === 'published',
  ).map(({ availability: _availability, publication_status: _publicationStatus, ...room }) => room);
}

export async function getRoomById(roomId: string): Promise<unknown> {
  const result = await findRoomById(roomId);
  const room = result.rows[0];
  if (
    !room ||
    room.status !== 'active' ||
    !room.availability ||
    room.publication_status !== 'published'
  ) {
    throw new AppError(404, 'Room not found', 'NOT_FOUND');
  }
  const { availability: _availability, publication_status: _publicationStatus, ...publicRoom } = room;
  return publicRoom;
}

export async function createRoom(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: Required<Pick<RoomInput, 'roomType' | 'capacity' | 'price'>> & RoomInput,
): Promise<unknown> {
  return inTransaction(async (client) => {
    const branch = await assertCanManageBranch(branchId, user, client, true);
    const result = await insertRoom(client, branchId, {
      roomType: input.roomType.trim(),
      description: input.description ?? null,
      capacity: input.capacity,
      quantity: input.quantity ?? 1,
      price: input.price,
      currency: input.currency?.toUpperCase() ?? branch.currency,
    });
    return result.rows[0];
  });
}

export async function updateRoom(
  roomId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: RoomInput,
): Promise<unknown> {
  return inTransaction(async (client) => {
    const room = await findRoomForUpdate(client, roomId);
    if (!room.rows[0]) throw new AppError(404, 'Room not found', 'NOT_FOUND');
    await assertCanManageBranch(room.rows[0].branch_id, user, client);

    if (input.quantity !== undefined && input.quantity !== room.rows[0].quantity) {
      const reservations = await hasFutureReservations(client, roomId);
      if (reservations.rowCount) {
        throw new AppError(409, 'Inventory cannot be changed while future reservations exist', 'INVENTORY_RESERVED');
      }
    }
    if (input.capacity !== undefined) {
      const oversizedBookings = await hasBookingsExceedingCapacity(client, roomId, input.capacity);
      if (oversizedBookings.rowCount) {
        throw new AppError(409, 'Capacity cannot be reduced below existing reservations', 'CAPACITY_RESERVED');
      }
    }
    const updated = await updateRoomRecord(client, roomId, {
      ...input,
      roomType: input.roomType?.trim(),
      currency: input.currency?.toUpperCase(),
    });
    return updated.rows[0];
  });
}
