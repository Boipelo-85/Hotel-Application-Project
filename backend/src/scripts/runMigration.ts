import { readFileSync } from 'node:fs';
import { initializeDatabase, inTransaction, closeDatabase } from '../config/database.js';
import { loadConfig } from '../config/env.js';
import { applyMigrations, prepareMigrationLedger } from '../services/migration.service.js';

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!['migrate', 'baseline', 'schema', 'status', 'seed', 'list-rooms'].includes(command ?? '')) {
    throw new Error('Usage: npm run db -- migrate [filename] | baseline <last-applied-filename> | schema | status | seed <filename> | list-rooms');
  }
  if (command === 'baseline' && !file) throw new Error('Baseline requires the last migration already applied to this database.');
  initializeDatabase(loadConfig());
  try {
    await inTransaction(async client => {
      if (command === 'migrate' || command === 'baseline') await applyMigrations(client, file, command === 'baseline');
      else if (command === 'schema') {
        await prepareMigrationLedger(client);
        await client.query(readFileSync(new URL('../../../database/schema.sql', import.meta.url), 'utf8'));
        await applyMigrations(client, undefined, true);
      } else if (command === 'status') {
        await prepareMigrationLedger(client);
        console.table((await client.query('SELECT filename, applied_at FROM schema_migrations ORDER BY filename')).rows);
      } else if (command === 'seed') {
        if (!file || !/^seed[\w-]*\.sql$/.test(file)) throw new Error('Choose a seed SQL filename from database/.');
        await client.query(readFileSync(new URL('../../../database/' + file, import.meta.url), 'utf8'));
      } else console.table((await client.query('SELECT id, room_type FROM rooms ORDER BY id')).rows);
    });
  } finally { await closeDatabase(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
