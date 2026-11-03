import type { PoolClient } from 'pg';
import { query } from '../config/database.js';
import { createHash } from 'crypto';

export function hashRefreshToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export async function createRefreshToken(
  client: PoolClient,
  userId: string,
  token: string,
  expiresAt: Date,
) {
  const tokenHash = hashRefreshToken(token);
  return client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt],
  );
}

export async function findRefreshToken(client: PoolClient, token: string) {
  const tokenHash = hashRefreshToken(token);
  return client.query(
    `SELECT id, user_id, token_hash, expires_at, revoked, created_at
     FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [tokenHash],
  );
}

export async function revokeRefreshToken(client: PoolClient, token: string) {
  const tokenHash = hashRefreshToken(token);
  return client.query(
    `UPDATE refresh_tokens
     SET revoked = TRUE
     WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function revokeAllUserTokens(client: PoolClient, userId: string) {
  return client.query(
    `UPDATE refresh_tokens
     SET revoked = TRUE
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId],
  );
}

export async function deleteExpiredTokens() {
  return query(
    `DELETE FROM refresh_tokens
     WHERE expires_at < NOW() OR revoked = TRUE`,
  );
}
