import { inTransaction } from '../config/database.js';
import {
  deactivateUser as deactivateUserRecord,
  findUserById,
  findUserProfile,
  saveUserProfile,
  updateUserRole as saveUserRole,
} from '../repositories/user.repository.js';
import { deleteUserAuthCodes } from '../repositories/auth.repository.js';
import { deleteUserSessions } from '../repositories/session.repository.js';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';

export async function getUserProfile(userId: string): Promise<AuthenticatedUser> {
  const result = await findUserProfile(userId);
  const user = result.rows[0];
  if (!user || !user.is_active) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const { is_active: _isActive, ...profile } = user;
  return profile;
}

export async function updateUserProfile(
  userId: string,
  values: { name?: string; phone?: string | null },
): Promise<AuthenticatedUser> {
  const result = await saveUserProfile(userId, values);
  const user = result.rows[0];
  if (!user || !user.is_active) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const { is_active: _isActive, ...profile } = user;
  return profile;
}

export async function updateUserRole(
  userId: string,
  role: 'customer' | 'branch_manager',
): Promise<AuthenticatedUser> {
  const result = await saveUserRole(userId, role);
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  return user;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await inTransaction(async (client) => {
    const result = await findUserById(client, userId);
    const user = result.rows[0];
    if (!user || !user.is_active) throw new AppError(404, 'User not found', 'NOT_FOUND');
    await deactivateUserRecord(client, userId);
    await deleteUserSessions(client, userId);
    await deleteUserAuthCodes(client, user.email);
  });
}
