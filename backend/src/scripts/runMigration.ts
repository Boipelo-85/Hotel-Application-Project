import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeDatabase, query, closeDatabase } from '../config/database.js';
import { loadConfig } from '../config/env.js';

async function runMigration(migrationFile: string) {
  const config = loadConfig();
  initializeDatabase(config);
  
  try {
    const migrationPath = join(process.cwd(), '..', 'database', 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log(`Running migration: ${migrationFile}`);
    await query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function runSeed(seedFile: string) {
  const config = loadConfig();
  initializeDatabase(config);
  
  try {
    const seedPath = join(process.cwd(), '..', 'database', seedFile);
    const sql = readFileSync(seedPath, 'utf-8');
    
    console.log(`Running seed: ${seedFile}`);
    await query(sql);
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function runSchema() {
  const config = loadConfig();
  initializeDatabase(config);
  
  try {
    const schemaPath = join(process.cwd(), '..', 'database', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf-8');
    
    console.log('Running base schema.sql');
    await query(sql);
    console.log('Schema completed successfully');
  } catch (error) {
    console.error('Schema failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function listRooms() {
  const config = loadConfig();
  initializeDatabase(config);
  
  try {
    const result = await query('SELECT id, room_type FROM rooms ORDER BY id');
    console.log('Existing rooms:');
    result.rows.forEach((row: any) => {
      console.log(`  ID: ${row.id}, Type: ${row.room_type}`);
    });
  } catch (error) {
    console.error('Failed to list rooms:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

const command = process.argv[2];
const file = process.argv[3];

if (command === 'migrate' && file) {
  runMigration(file).catch(() => process.exit(1));
} else if (command === 'seed' && file) {
  runSeed(file).catch(() => process.exit(1));
} else if (command === 'schema') {
  runSchema().catch(() => process.exit(1));
} else if (command === 'list-rooms') {
  listRooms().catch(() => process.exit(1));
} else {
  console.log('Usage: tsx runMigration.ts migrate <migration-file> | seed <seed-file> | schema | list-rooms');
  console.log('Example: tsx runMigration.ts migrate 006_room_details_enhancement.sql');
  console.log('Example: tsx runMigration.ts seed seed_room_details.sql');
  console.log('Example: tsx runMigration.ts schema');
  console.log('Example: tsx runMigration.ts list-rooms');
  process.exit(1);
}
