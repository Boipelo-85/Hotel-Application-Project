import { query } from '../config/database.js';

export async function checkDatabaseConnection(): Promise<void> {
  await query('SELECT 1');
}
