import { query } from '../config/database.js';
import type { User, UserInput } from '../types/models.js';

export async function createUser(user: UserInput): Promise<User> {
  const result = await query<User>(
    'INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [user.fullname, user.email, user.password, user.role || 'customer']
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function findUserById(user_id: number): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE user_id = $1', [user_id]);
  return result.rows[0] || null;
}

export async function updateUser(user_id: number, updates: Partial<UserInput>): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.fullname !== undefined) {
    fields.push(`fullname = $${paramIndex++}`);
    values.push(updates.fullname);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.password !== undefined) {
    fields.push(`password = $${paramIndex++}`);
    values.push(updates.password);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }

  if (fields.length === 0) return null;

  values.push(user_id);
  const result = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteUser(user_id: number): Promise<boolean> {
  const result = await query('DELETE FROM users WHERE user_id = $1', [user_id]);
  return (result.rowCount || 0) > 0;
}
