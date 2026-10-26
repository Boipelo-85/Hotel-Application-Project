import { inTransaction } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import { createAmenity as insertAmenity, listAmenities as selectAmenities, replaceBranchAmenities } from '../repositories/amenity.repository.js';
import { insertBranchImage, removeBranchImage } from '../repositories/branch-image.repository.js';
import type { BranchInput } from '../types/models.js';
import { countNights } from './availability.service.js';
import {
  findBranch,
  findBranchManager,
  findBranchManagerUser,
  insertBranch,
  listBranches as selectBranches,
  listManagedBranches as selectManagedBranches,
  searchAvailableBranches as searchAvailableBranchesQuery,
  saveBranchPublicationStatus,
  updateBranchManager as saveBranchManager,
  updateBranchRecord,
} from '../repositories/branch.repository.js';

export async function listBranches(search?: string, city?: string): Promise<unknown[]> {
  const result = await selectBranches(search?.trim() || null, city?.trim() || null);
  return result.rows;
}

export async function searchAvailableBranches(input: {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
}): Promise<unknown[]> {
  countNights(input.checkIn, input.checkOut);
  if (new Date(`${input.checkIn}T00:00:00.000Z`) < new Date(new Date().toISOString().slice(0, 10))) {
    throw new AppError(400, 'Check-in date cannot be in the past', 'INVALID_DATES');
  }
  const result = await searchAvailableBranchesQuery(input);
  return result.rows;
}

export async function listManagedBranches(user: Pick<AuthenticatedUser, 'id' | 'role'>): Promise<unknown[]> {
  const result = await selectManagedBranches(user);
  return result.rows;
}

export async function getBranch(branchId: string, allowUnpublished = false): Promise<unknown> {
  const result = await findBranch(branchId, allowUnpublished);
  const branch = result.rows[0];
  if (!branch) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  return branch;
}

async function assertCanManageBranch(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  client?: PoolClient,
): Promise<void> {
  const result = await findBranchManager(branchId, client, Boolean(client));
  if (!result.rows[0]) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  if (
    user.role !== 'admin' &&
    result.rows[0].manager_user_id !== user.id
  ) {
    throw new AppError(403, 'You cannot manage this branch', 'FORBIDDEN');
  }
}

export async function createBranch(
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: Required<Pick<BranchInput, 'name' | 'city' | 'province' | 'address' | 'pricePerNight'>> & BranchInput,
): Promise<unknown> {
  if (user.role !== 'admin') {
    throw new AppError(403, 'Only an administrator can create branches', 'FORBIDDEN');
  }
  return inTransaction(async (client) => {
    if (input.managerUserId) {
      const manager = await findBranchManagerUser(input.managerUserId, client);
      if (!manager.rowCount) {
        throw new AppError(400, 'Selected user is not a branch manager', 'INVALID_BRANCH_MANAGER');
      }
    }

    const result = await insertBranch(
      client,
      {
        ...input,
        name: input.name.trim(),
        city: input.city.trim(),
        province: input.province.trim(),
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
      input.managerUserId ?? null,
      'published',
    );
    return result.rows[0];
  });
}

export async function assignBranchManager(branchId: string, managerUserId: string | null): Promise<unknown> {
  return inTransaction(async (client) => {
    if (managerUserId) {
      const manager = await findBranchManagerUser(managerUserId, client);
      if (!manager.rowCount) {
        throw new AppError(400, 'Selected user is not a branch manager', 'INVALID_BRANCH_MANAGER');
      }
    }
    const result = await saveBranchManager(client, branchId, managerUserId);
    if (!result.rows[0]) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
    return result.rows[0];
  });
}

export async function updateBranch(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: BranchInput,
): Promise<unknown> {
  return inTransaction(async (client) => {
    await assertCanManageBranch(branchId, user, client);
    const normalizedInput: BranchInput = {
      ...input,
      name: input.name?.trim(),
      city: input.city?.trim(),
      province: input.province?.trim(),
      address: input.address?.trim(),
      currency: input.currency?.toUpperCase(),
      contactEmail: input.contactEmail?.trim().toLowerCase(),
    };
    const result = await updateBranchRecord(client, branchId, user.role, normalizedInput);
    if (!result.rows[0]) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
    return result.rows[0];
  });
}

export async function updateBranchPublicationStatus(
  branchId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected',
): Promise<unknown> {
  const result = await saveBranchPublicationStatus(branchId, status);
  if (!result.rows[0]) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  return result.rows[0];
}

export async function archiveBranch(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageBranch(branchId, user, client);
    const result = await saveBranchPublicationStatus(branchId, 'draft', client);
    if (!result.rowCount) {
      const branch = await findBranchManager(branchId, client);
      if (!branch.rowCount) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
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

export async function addBranchImage(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  input: { imageUrl: string; altText?: string; displayOrder?: number },
): Promise<unknown> {
  return inTransaction(async (client) => {
    await assertCanManageBranch(branchId, user, client);
    const result = await insertBranchImage(client, branchId, {
      imageUrl: input.imageUrl,
      altText: input.altText ?? null,
      displayOrder: input.displayOrder ?? 0,
    });
    return result.rows[0];
  });
}

export async function deleteBranchImage(
  branchId: string,
  imageId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageBranch(branchId, user, client);
    const result = await removeBranchImage(client, branchId, imageId);
    if (!result.rowCount) throw new AppError(404, 'Branch image not found', 'NOT_FOUND');
  });
}

export async function setBranchAmenities(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  amenityIds: string[],
): Promise<void> {
  await inTransaction(async (client) => {
    await assertCanManageBranch(branchId, user, client);
    const uniqueIds = [...new Set(amenityIds)];
    const inserted = await replaceBranchAmenities(client, branchId, uniqueIds);
    if (inserted !== uniqueIds.length) {
      throw new AppError(400, 'One or more amenities do not exist', 'INVALID_AMENITIES');
    }
  });
}
