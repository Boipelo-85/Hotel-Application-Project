import { query } from '../config/database.js';
import type { PoolClient } from 'pg';
import type { AuthenticatedUser } from '../types/models.js';

export async function createSession(
  client: PoolClient,
  tokenHash: Buffer,
  userId: string,
  ttlHours: number,
) {
  return client.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 hour'))`,
    [tokenHash, userId, ttlHours],
  );
}

export async function deleteSession(tokenHash: Buffer) {
  return query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
}

export async function findSessionUser(tokenHash: Buffer) {
  return query<Pick<AuthenticatedUser, 'id' | 'role' | 'email'>>(
    `SELECT u.id, u.role, u.email
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > CURRENT_TIMESTAMP
       AND u.email_verified = TRUE
       AND u.is_active = TRUE`,
    [tokenHash],
  );
}

export async function deleteUserSessions(client: PoolClient, userId: string) {
  return client.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
}

export async function deleteExpiredSessions(client: PoolClient) {
  return client.query('DELETE FROM auth_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
}
