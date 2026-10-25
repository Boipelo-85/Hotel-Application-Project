import { inTransaction } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import { createAmenity as insertAmenity, listAmenities as selectAmenities, replaceHotelAmenities } from '../repositories/amenity.repository.js';
import { insertHotelImage, removeHotelImage } from '../repositories/hotel-image.repository.js';
import type { HotelInput } from '../types/models.js';
import {
  findHotel,
  findHotelOwner,
  insertHotel,
  listHotels as selectHotels,
  listManagedHotels as selectManagedHotels,
  saveHotelPublicationStatus,
  updateHotelRecord,
} from '../repositories/hotel.repository.js';

export async function listHotels(search?: string): Promise<unknown[]> {
  const result = await selectHotels(search?.trim() || null);
  return result.rows;
}

export async function listManagedHotels(user: Pick<AuthenticatedUser, 'id' | 'role'>): Promise<unknown[]> {
  const result = await selectManagedHotels(user);
  return result.rows;
}

export async function getHotel(hotelId: string, allowUnpublished = false): Promise<unknown> {
  const result = await findHotel(hotelId, allowUnpublished);
  const hotel = result.rows[0];
  if (!hotel) throw new AppError(404, 'Hotel not found', 'NOT_FOUND');
  return hotel;
}

async function assertCanManageHotel(
  hotelId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  client?: PoolClient,
): Promise<void> {
  const result = await findHotelOwner(hotelId, client, Boolean(client));
  if (!result.rows[0]) throw new AppError(404, 'Hotel not found', 'NOT_FOUND');
  if (user.role !== 'admin' && result.rows[0].partner_user_id !== user.id) {
    throw new AppError(403, 'You cannot manage this hotel', 'FORBIDDEN');
  }
}

export async function createHotel(
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: Required<Pick<HotelInput, 'name' | 'address' | 'pricePerNight'>> & HotelInput,
): Promise<unknown> {
  const result = await insertHotel(
    {
      ...input,
      name: input.name.trim(),
      address: input.address.trim(),
      description: input.description ?? null,
      starRating: input.starRating ?? null,
      policies: input.policies ?? {},
      currency: input.currency?.toUpperCase() ?? 'USD',
      contactEmail: input.contactEmail?.trim().toLowerCase() ?? null,
      contactPhone: input.contactPhone ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    },
    user.role === 'hotel_partner' ? user.id : null,
    user.role === 'admin' ? 'published' : 'pending_review',
  );
  return result.rows[0];
}

export async function updateHotel(
  hotelId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: HotelInput,
): Promise<unknown> {
  return inTransaction(async (client) => {
    await assertCanManageHotel(hotelId, user, client);
    const normalizedInput: HotelInput = {
      ...input,
      name: input.name?.trim(),
      address: input.address?.trim(),
      currency: input.currency?.toUpperCase(),
      contactEmail: input.contactEmail?.trim().toLowerCase(),
    };
    const result = await updateHotelRecord(client, hotelId, user.role, normalizedInput);
    if (!result.rows[0]) throw new AppError(404, 'Hotel not found', 'NOT_FOUND');
    return result.rows[0];
  });
}

export async function updateHotelPublicationStatus(
  hotelId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected',
): Promise<unknown> {
  const result = await saveHotelPublicationStatus(hotelId, status);
  if (!result.rows[0]) throw new AppError(404, 'Hotel not found', 'NOT_FOUND');
  return result.rows[0];
}

export async function archiveHotel(
  hotelId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageHotel(hotelId, user, client);
    const result = await saveHotelPublicationStatus(hotelId, 'draft', client);
    if (!result.rowCount) {
      const hotel = await findHotelOwner(hotelId, client);
      if (!hotel.rowCount) throw new AppError(404, 'Hotel not found', 'NOT_FOUND');
    }
  });
}

export async function listAmenities(): Promise<unknown[]> {
  const result = await selectAmenities();
  return result.rows;
}

export async function createAmenity(name: string, category?: string): Promise<unknown> {
  const result = await insertAmenity(name.trim(), category?.trim() ?? null);
  return result.rows[0];
}

export async function addHotelImage(
  hotelId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: { imageUrl: string; altText?: string; displayOrder?: number },
): Promise<unknown> {
  return inTransaction(async (client) => {
  await assertCanManageHotel(hotelId, user, client);
  const result = await insertHotelImage(client, hotelId, {
    imageUrl: input.imageUrl,
    altText: input.altText ?? null,
    displayOrder: input.displayOrder ?? 0,
  });
  return result.rows[0];
  });
}

export async function deleteHotelImage(
  hotelId: string,
  imageId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageHotel(hotelId, user, client);
    const result = await removeHotelImage(client, hotelId, imageId);
    if (!result.rowCount) throw new AppError(404, 'Hotel image not found', 'NOT_FOUND');
  });
}

export async function setHotelAmenities(
  hotelId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  amenityIds: string[],
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageHotel(hotelId, user, client);
    const uniqueIds = [...new Set(amenityIds)];
    const inserted = await replaceHotelAmenities(client, hotelId, uniqueIds);
    if (inserted !== uniqueIds.length) {
      throw new AppError(400, 'One or more amenities do not exist', 'INVALID_AMENITIES');
    }
  });
}
