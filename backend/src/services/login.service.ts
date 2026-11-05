import { verifyAdminCredentials, getAdminUserByEmail } from './admin.service.js';
import { createSession } from './auth.service.js';
import type { PoolClient } from 'pg';
import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { verifyPassword } from '../utils/password.js';
import { findUserByEmail } from '../repositories/user.repository.js';
import { createRefreshToken, revokeAllUserTokens } from '../repositories/refresh-token.repository.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import type { AuthenticatedUser } from '../types/models.js';

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginResult =
  | { user: AuthenticatedUser; token: string }
  | { user: AuthenticatedUser; accessToken: string; refreshToken: string };

export async function loginUser(
  config: AppConfig,
  input: LoginInput,
): Promise<LoginResult> {
  const normalizedEmail = input.email.trim().toLowerCase();

  // A configured admin email must never fall through to password-hash login.
  if (config.ADMIN_LOGIN_EMAIL && normalizedEmail === config.ADMIN_LOGIN_EMAIL.trim().toLowerCase()) {
    if (!await verifyAdminCredentials(normalizedEmail, input.password, config)) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_PASSWORD');
    }
    const user = await getAdminUserByEmail(normalizedEmail);
    if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_PASSWORD');
    const token = await inTransaction(client => createSession(client, user.id, config));
    return { user, token };
  }

  const result = await inTransaction(async (client: PoolClient) => {
    // Find user by email
    const userResult = await findUserByEmail(client, normalizedEmail);
    const user = userResult.rows[0];

    // Generic error for wrong email or password
    if (!user) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_PASSWORD');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AppError(403, 'Account has been deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Check if user has a password (Google-only users don't)
    if (!user.password_hash) {
      throw new AppError(
        400,
        'This account uses Google sign-in. Please use "Continue with Google" to log in.',
        'OAUTH_ONLY_ACCOUNT',
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_PASSWORD');
    }

    // Revoke all existing refresh tokens (rotation on login)
    await revokeAllUserTokens(client, user.id);

    // Generate new tokens
    const accessToken = generateAccessToken(
      { userId: user.id, email: user.email, role: user.role },
      config,
    );
    const refreshToken = generateRefreshToken(user.id, config);

    // Store new refresh token (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRefreshToken(client, user.id, refreshToken, expiresAt);

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
      accessToken,
      refreshToken,
    };
  });

  return result;
}
