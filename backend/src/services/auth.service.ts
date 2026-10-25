import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';
import { consumeRateLimit } from './rate-limit.service.js';
import type { AuthenticatedUser } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import { sendVerificationCode } from './notification.service.js';
import { hashSessionToken } from '../utils/session.js';
import {
  deleteAuthCode,
  findAuthCode,
  incrementAuthCodeAttempts,
  saveAuthCode,
} from '../repositories/auth.repository.js';
import { upsertVerifiedUser } from '../repositories/user.repository.js';
import {
  createSession as persistSession,
  deleteSession,
  findSessionUser,
} from '../repositories/session.repository.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(config: AppConfig, email: string, code: string): Buffer {
  return createHmac('sha256', config.OTP_PEPPER).update(`${email}:${code}`).digest();
}

async function createSession(
  client: PoolClient,
  userId: string,
  config: AppConfig,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await persistSession(client, hashSessionToken(token), userId, config.SESSION_TTL_HOURS);
  return token;
}

export async function requestVerificationCode(
  config: AppConfig,
  emailInput: string,
  ip: string,
): Promise<void> {
  const email = normalizeEmail(emailInput);
  await consumeRateLimit(config, `otp:email:${email}`, 3, 15 * 60);
  await consumeRateLimit(config, `otp:request-ip:${ip}`, 8, 15 * 60);

  const code = randomInt(100_000, 1_000_000).toString();
  const codeHash = hashCode(config, email, code);
  await saveAuthCode(email, codeHash, config.OTP_TTL_MINUTES);

  try {
    await sendVerificationCode(config, email, code);
  } catch (error) {
    await deleteAuthCode(email, codeHash);
    throw error;
  }
}

interface VerificationResult {
  user?: AuthenticatedUser;
  token?: string;
  invalid?: true;
}

async function consumeVerificationCode(
  client: PoolClient,
  config: AppConfig,
  email: string,
  code: string,
  name?: string,
): Promise<VerificationResult> {
  const stored = await findAuthCode(client, email);
  const row = stored.rows[0];
  if (!row || new Date(row.expires_at).getTime() <= Date.now() || row.attempts >= 5) {
    if (row) await deleteAuthCode(email, undefined, client);
    return { invalid: true };
  }

  const suppliedHash = hashCode(config, email, code);
  if (row.code_hash.length !== suppliedHash.length || !timingSafeEqual(row.code_hash, suppliedHash)) {
    if (row.attempts + 1 >= 5) {
      await deleteAuthCode(email, undefined, client);
    } else {
      await incrementAuthCodeAttempts(client, email);
    }
    return { invalid: true };
  }

  await deleteAuthCode(email, undefined, client);
  const suppliedName = name?.trim() ?? '';
  const displayName = suppliedName || email.slice(0, email.indexOf('@'));
  const userResult = await upsertVerifiedUser(client, email, displayName, suppliedName.length > 0);
  const user = userResult.rows[0];
  if (!user.is_active) {
    throw new AppError(403, 'This account has been deactivated', 'ACCOUNT_DEACTIVATED');
  }
  const token = await createSession(client, user.id, config);
  return { user, token };
}

export async function verifyCodeAndCreateSession(
  config: AppConfig,
  emailInput: string,
  code: string,
  name?: string,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const email = normalizeEmail(emailInput);
  const result = await inTransaction((client) =>
    consumeVerificationCode(client, config, email, code, name),
  );
  if (result.invalid || !result.user || !result.token) {
    throw new AppError(400, 'The verification code is invalid or expired', 'INVALID_CODE');
  }
  return { user: result.user, token: result.token };
}

export async function revokeSession(token: string): Promise<void> {
  await deleteSession(hashSessionToken(token));
}

export async function getSessionUser(token: string) {
  const result = await findSessionUser(hashSessionToken(token));
  return result.rows[0];
}
