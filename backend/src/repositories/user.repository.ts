import type { PoolClient } from 'pg';
import { query } from '../config/database.js';
import type { AuthenticatedUser } from '../types/models.js';

export async function findUserById(client: PoolClient, userId: string) {
  return client.query<{ id: string; email: string; is_active: boolean }>(
    'SELECT id, email, is_active FROM users WHERE id = $1 FOR UPDATE',
    [userId],
  );
}

export async function deactivateUser(client: PoolClient, userId: string) {
  return client.query(
    `UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING id`,
    [userId],
  );
}

export async function upsertVerifiedUser(
  client: PoolClient,
  email: string,
  name: string,
  updateName: boolean,
) {
  return client.query<AuthenticatedUser & { is_active: boolean }>(
    `INSERT INTO users (name, email, role, email_verified)
     VALUES ($1, $2, 'customer', TRUE)
     ON CONFLICT (LOWER(BTRIM(email))) DO UPDATE
       SET email = EXCLUDED.email,
           email_verified = TRUE,
           name = CASE WHEN $3::BOOLEAN THEN EXCLUDED.name ELSE users.name END,
           updated_at = CURRENT_TIMESTAMP
     RETURNING id, name, email, role, email_verified, phone, is_active, created_at, updated_at`,
    [name, email, updateName],
  );
}

export async function updateUserRole(userId: string, role: 'customer' | 'branch_manager') {
  return query<AuthenticatedUser>(
    `UPDATE users SET role = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING id, name, email, role, email_verified, phone, created_at, updated_at`,
    [userId, role],
  );
}

export async function findUserProfile(userId: string) {
  return query<AuthenticatedUser & { is_active: boolean }>(
    `SELECT id, name, email, role, email_verified, phone, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
}

export async function saveUserProfile(
  userId: string,
  values: { name?: string; phone?: string | null },
) {
  return query<AuthenticatedUser & { is_active: boolean }>(
    `UPDATE users
     SET name = COALESCE($2, name),
         phone = CASE WHEN $3::boolean THEN $4 ELSE phone END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, email_verified, phone, is_active, created_at, updated_at`,
    [userId, values.name ?? null, values.phone !== undefined, values.phone ?? null],
  );
}
