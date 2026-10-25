import { query } from '../config/database.js';
import type { PoolClient } from 'pg';

export async function saveAuthCode(email: string, codeHash: Buffer, ttlMinutes: number) {
  return query(
    `INSERT INTO auth_codes (email, code_hash, attempts, expires_at, created_at)
     VALUES ($1, $2, 0, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'), CURRENT_TIMESTAMP)
     ON CONFLICT (email) DO UPDATE
     SET code_hash = EXCLUDED.code_hash, attempts = 0,
         expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP`,
    [email, codeHash, ttlMinutes],
  );
}

export async function deleteAuthCode(email: string, codeHash?: Buffer, client?: PoolClient) {
  const execute = client ? client.query.bind(client) : query;
  if (codeHash) {
    return execute('DELETE FROM auth_codes WHERE email = $1 AND code_hash = $2', [email, codeHash]);
  }
  return execute('DELETE FROM auth_codes WHERE email = $1', [email]);
}

export async function findAuthCode(client: PoolClient, email: string) {
  return client.query<{ code_hash: Buffer; attempts: number; expires_at: Date }>(
    'SELECT code_hash, attempts, expires_at FROM auth_codes WHERE email = $1 FOR UPDATE',
    [email],
  );
}

export async function incrementAuthCodeAttempts(client: PoolClient, email: string) {
  return client.query('UPDATE auth_codes SET attempts = attempts + 1 WHERE email = $1', [email]);
}

export async function deleteExpiredAuthCodes(client: PoolClient) {
  return client.query('DELETE FROM auth_codes WHERE expires_at <= CURRENT_TIMESTAMP');
}

export async function deleteUserAuthCodes(client: PoolClient, email: string) {
  return client.query('DELETE FROM auth_codes WHERE email = $1', [email]);
}
