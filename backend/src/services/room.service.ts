import { inTransaction } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import {
  findBranchManager,
  findRoomById,
  findRoomForUpdate,
  findRoomImages,
  findRoomAmenities,
  hasBookingsExceedingCapacity,
  hasFutureReservations,
  insertRoom,
  listRooms as selectRooms,
  updateRoomRecord,
} from '../repositories/room.repository.js';
import { insertRoomImage, removeRoomImage, listRoomImages } from '../repositories/room-image.repository.js';

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
    (room: any) => room.status === 'active' && room.availability && room.publication_status === 'published',
  ).map(({ availability: _availability, publication_status: _publicationStatus, ...room }: any) => {
    // Transform image fields to match frontend expectations
    return {
      ...room,
      images: room.image_url ? [{
        id: `${room.id}_img`,
        image_url: room.image_url,
        alt_text: room.image_alt_text,
        display_order: 0
      }] : []
    };
  });
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
  
  const [imagesResult, amenitiesResult] = await Promise.all([
    findRoomImages(roomId),
    findRoomAmenities(roomId),
  ]);
  
  const { availability: _availability, publication_status: _publication_status, ...publicRoom } = room;
  
  // Group amenities by category
  const amenitiesByCategory = amenitiesResult.rows.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity.amenity_name);
    return acc;
  }, {} as Record<string, string[]>);
  
  return {
    ...publicRoom,
    images: imagesResult.rows,
    amenities: amenitiesByCategory,
  };
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

export async function deleteRoom(
  roomId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    const room = await findRoomForUpdate(client, roomId);
    if (!room.rows[0]) throw new AppError(404, 'Room not found', 'NOT_FOUND');
    await assertCanManageBranch(room.rows[0].branch_id, user, client);
    await hasBookingsExceedingCapacity(client, roomId, 100);
    await hasFutureReservations(client, roomId);
    await updateRoomRecord(client, roomId, { status: 'inactive' });
  });
}

export async function addRoomImage(
  roomId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: { imageUrl: string; altText?: string; displayOrder?: number },
): Promise<unknown> {
  return inTransaction(async (client) => {
    const room = await findRoomForUpdate(client, roomId);
    if (!room.rows[0]) throw new AppError(404, 'Room not found', 'NOT_FOUND');
    await assertCanManageBranch(room.rows[0].branch_id, user, client);
    const result = await insertRoomImage(client, roomId, {
      imageUrl: input.imageUrl,
      altText: input.altText ?? null,
      displayOrder: input.displayOrder ?? 0,
    });
    return result.rows[0];
  });
}

export async function deleteRoomImage(
  roomId: string,
  imageId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    const room = await findRoomForUpdate(client, roomId);
    if (!room.rows[0]) throw new AppError(404, 'Room not found', 'NOT_FOUND');
    await assertCanManageBranch(room.rows[0].branch_id, user, client);
    const result = await removeRoomImage(client, roomId, imageId);
    if (!result.rowCount) throw new AppError(404, 'Room image not found', 'NOT_FOUND');
  });
}
