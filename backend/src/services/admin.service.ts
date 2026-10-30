import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';

export async function seedAdminUser(config: AppConfig): Promise<void> {
  if (!config.ADMIN_LOGIN_EMAIL || !config.ADMIN_LOGIN_PASSWORD) {
    console.log('Admin credentials not configured, skipping admin seed');
    return;
  }

  try {
    await inTransaction(async (client) => {
      // Check if admin already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE email = $1 AND role = $2',
        [config.ADMIN_LOGIN_EMAIL!.toLowerCase(), 'admin']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('Admin user already exists, skipping seed');
        return;
      }

      // Insert admin user (no password stored - verified against env)
      await client.query(
        `INSERT INTO users (name, email, role, email_verified, is_active)
         VALUES ($1, $2, $3, TRUE, TRUE)
         ON CONFLICT (LOWER(BTRIM(email))) DO UPDATE SET
           role = EXCLUDED.role,
           email_verified = TRUE,
           is_active = TRUE`,
        ['Admin User', config.ADMIN_LOGIN_EMAIL!.toLowerCase(), 'admin']
      );

      console.log('Admin user seeded successfully');
    });
  } catch (error) {
    console.error('Failed to seed admin user:', error);
    throw error;
  }
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
  config: AppConfig
): Promise<boolean> {
  if (!config.ADMIN_LOGIN_EMAIL || !config.ADMIN_LOGIN_PASSWORD) {
    return false;
  }

  const emailMatch = email.toLowerCase() === config.ADMIN_LOGIN_EMAIL.toLowerCase();
  const passwordMatch = password === config.ADMIN_LOGIN_PASSWORD;

  return emailMatch && passwordMatch;
}

export async function getAdminUserByEmail(email: string) {
  const { query } = await import('../config/database.js');
  const result = await query(
    `SELECT id, name, email, role, email_verified, is_active
     FROM users
     WHERE email = $1 AND role = 'admin' AND is_active = TRUE`,
    [email.toLowerCase()]
  );
  return result.rows[0];
}
