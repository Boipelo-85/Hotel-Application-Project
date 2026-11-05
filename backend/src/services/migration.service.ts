import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';

const directory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url));
export function migrationFiles() { return readdirSync(directory).filter(name => /^\d+_[\w-]+\.sql$/.test(name)).sort(); }
export function migrationSource(name: string) {
  if (!migrationFiles().includes(name)) throw new Error('Unknown migration filename');
  const source = readFileSync(new URL(name, new URL('../../../database/migrations/', import.meta.url)), 'utf8');
  return { checksum: createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex'),
    sql: source.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gim, '') };
}
export async function prepareMigrationLedger(client: PoolClient) {
  await client.query('SELECT pg_advisory_xact_lock(724391023)');
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY, checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}
export async function applyMigrations(client: PoolClient, through?: string, baseline = false) {
  await prepareMigrationLedger(client);
  const files = migrationFiles();
  if (through && !files.includes(through)) throw new Error('Unknown migration filename');
  const selected = through ? files.slice(0, files.indexOf(through) + 1) : files;
  for (const name of selected) {
    const source = migrationSource(name);
    const previous = await client.query<{ checksum: string }>('SELECT checksum FROM schema_migrations WHERE filename = $1', [name]);
    if (previous.rows[0]) {
      if (previous.rows[0].checksum !== source.checksum) throw new Error(`Applied migration has changed: ${name}`);
      continue;
    }
    if (!baseline) await client.query(source.sql);
    await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [name, source.checksum]);
    console.info(`${baseline ? 'Recorded existing' : 'Applied'} migration: ${name}`);
  }
}
