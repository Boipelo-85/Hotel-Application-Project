import type { PoolClient } from 'pg';
import type { AppConfig } from '../config/env.js';
import { generateAccessToken, type JwtPayload } from '../utils/jwt.js';
import { createSession } from '../repositories/session.repository.js';
import { hashSessionToken } from '../utils/session.js';

// JWT cookies use the same revocable session store as OTP and staff sessions.
export async function issueAccessToken(client: PoolClient, payload: JwtPayload, config: AppConfig): Promise<string> {
  const token = generateAccessToken(payload, config);
  await createSession(client, hashSessionToken(token), payload.userId, 0.25);
  return token;
}
