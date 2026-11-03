import { loadConfig } from '../config/env.js';
import { query } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

export async function seedAdminUser(): Promise<void> {
  const config = loadConfig();

  if (!config.ADMIN_EMAIL || !config.ADMIN_LOGIN_PASSWORD) {
    console.log('ADMIN_EMAIL or ADMIN_LOGIN_PASSWORD not set. Skipping admin seed.');
    return;
  }

  console.log('Checking for existing admin user...');

  const result = await query(
    'SELECT id, email, role FROM users WHERE email = LOWER(BTRIM($1))',
    [config.ADMIN_EMAIL],
  );

  if (result.rows.length > 0) {
    const existingUser = result.rows[0];
    if (existingUser.role === 'admin') {
      console.log('Admin user already exists. Skipping seed.');
      return;
    }
    
    // Update existing user to admin role
    await query(
      `UPDATE users 
       SET role = 'admin', 
           password_hash = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [existingUser.id, await hashPassword(config.ADMIN_LOGIN_PASSWORD)],
    );
    console.log('Updated existing user to admin role.');
    return;
  }

  // Create new admin user
  const passwordHash = await hashPassword(config.ADMIN_LOGIN_PASSWORD);
  const name = config.ADMIN_EMAIL.split('@')[0];

  await query(
    `INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE, TRUE)`,
    [name, config.ADMIN_EMAIL.toLowerCase(), passwordHash],
  );

  console.log('Admin user created successfully.');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser()
    .then(() => {
      console.log('Admin seed completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin seed failed:', error);
      process.exit(1);
    });
}
