import type { PoolClient } from 'pg';
import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, validatePasswordStrength, validatePhoneNumber } from '../utils/password.js';
import { createUser, findUserByEmail } from '../repositories/user.repository.js';
import { createRefreshToken } from '../repositories/refresh-token.repository.js';
import { issueAccessToken } from './access-token.service.js';
import { generateRefreshToken } from '../utils/jwt.js';
import type { AuthenticatedUser } from '../types/models.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface RegisterResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  config: AppConfig,
  input: RegisterInput,
): Promise<RegisterResult> {
  // Validate name
  if (input.name.length < 2 || input.name.length > 100) {
    throw new AppError(400, 'Name must be between 2 and 100 characters', 'INVALID_NAME');
  }

  // Validate email format (basic check, Zod will handle full validation in controller)
  const normalizedEmail = input.email.trim().toLowerCase();
  if (config.ADMIN_LOGIN_EMAIL && normalizedEmail === config.ADMIN_LOGIN_EMAIL.trim().toLowerCase()) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(input.password);
  if (!passwordValidation.valid) {
    throw new AppError(400, passwordValidation.error || 'Invalid password', 'WEAK_PASSWORD');
  }

  // Validate password confirmation
  if (input.password !== input.confirmPassword) {
    throw new AppError(400, 'Passwords do not match', 'PASSWORD_MISMATCH');
  }

  // Validate phone if provided
  if (input.phone && !validatePhoneNumber(input.phone)) {
    throw new AppError(400, 'Invalid phone number format', 'INVALID_PHONE');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user and session in transaction
  const result = await inTransaction(async (client: PoolClient) => {
    // Check for duplicate email
    const existingUser = await findUserByEmail(client, normalizedEmail);
    if (existingUser.rows.length > 0) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    // Create user
    const userResult = await createUser(
      client,
      input.name,
      normalizedEmail,
      passwordHash,
      input.phone || null,
    );
    const user = userResult.rows[0];

    if (!user.is_active) {
      throw new AppError(403, 'Account has been deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Generate tokens
    const accessToken = await issueAccessToken(client,
{ userId: user.id, email: user.email, role: user.role },
      config,
    );
    const refreshToken = generateRefreshToken(user.id, config);

    // Store refresh token (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRefreshToken(client, user.id, refreshToken, expiresAt);

    return { user, accessToken, refreshToken };
  });

  return result;
}
