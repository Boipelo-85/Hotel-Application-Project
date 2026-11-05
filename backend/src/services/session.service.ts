import { deleteUserSessions } from '../repositories/session.repository.js';
import type { PoolClient } from 'pg';
import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { findRefreshToken, revokeRefreshToken, revokeAllUserTokens, createRefreshToken } from '../repositories/refresh-token.repository.js';
import { issueAccessToken } from './access-token.service.js';
import { generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { findUserProfile } from '../repositories/user.repository.js';
import type { AuthenticatedUser } from '../types/models.js';

export interface RefreshResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export async function refreshSession(
  config: AppConfig,
  refreshToken: string,
): Promise<RefreshResult> {
  const result = await inTransaction(async (client: PoolClient) => {
    // Verify JWT signature
    const payload = verifyRefreshToken(refreshToken, config);

    // Find refresh token in database
    const tokenResult = await findRefreshToken(client, refreshToken);
    const token = tokenResult.rows[0];

    if (!token) {
      throw new AppError(401, 'Invalid or expired refresh token', 'UNAUTHENTICATED');
    }

    // Get user
    const userResult = await findUserProfile(payload.userId);
    const user = userResult.rows[0];

    if (!user || !user.is_active) {
      throw new AppError(401, 'User not found or inactive', 'UNAUTHENTICATED');
    }

    // Revoke old refresh token (rotation)
    await revokeRefreshToken(client, refreshToken);

    // Generate new tokens
    const newAccessToken = await issueAccessToken(client,
{ userId: user.id, email: user.email, role: user.role },
      config,
    );
    const newRefreshToken = generateRefreshToken(user.id, config);

    // Store new refresh token (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRefreshToken(client, user.id, newRefreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  });

  return result;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await inTransaction(async (client: PoolClient) => {
    await revokeRefreshToken(client, refreshToken);
  });
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await inTransaction(async (client: PoolClient) => {
    await revokeAllUserTokens(client, userId);
    await deleteUserSessions(client, userId);
  });
}
