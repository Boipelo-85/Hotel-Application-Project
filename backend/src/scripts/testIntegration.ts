import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Pool } from 'pg';
import { loadConfig } from '../config/env.js';

// All fixtures live in a newly created private schema, never the application's tables.
const config = loadConfig();
const schema = `hotel_test_${randomBytes(12).toString('hex')}`;
const connectionString = process.env.TEST_DATABASE_URL ?? config.DATABASE_URL;
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined });
let created = false;
try {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    created = true;
    await client.query(`SET search_path TO ${schema}`);
    await client.query(readFileSync(new URL('../../../database/schema.sql', import.meta.url), 'utf8'));
  } finally { client.release(); }
  const url = new URL(connectionString);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--test', 'tests/availability.integration.test.ts'], {
      cwd: new URL('../../', import.meta.url), stdio: 'inherit',
      env: { ...process.env, TEST_DATABASE_URL: url.toString() },
    });
    child.on('error', reject); child.on('exit', code => resolve(code ?? 1));
  });
  process.exitCode = code;
} catch (error) {
  console.error('Isolated database tests could not run:', error instanceof Error ? error.message : 'Database unavailable');
  process.exitCode = 1;
} finally {
  if (created && /^hotel_test_[a-f0-9]{24}$/.test(schema)) await pool.query(`DROP SCHEMA ${schema} CASCADE`);
  await pool.end();
}
