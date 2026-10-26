import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { closeDatabase, initializeDatabase, query } from './config/database.js';
import { loadConfig } from './config/env.js';
import { createSimpleApp } from './app-simple.js';

async function start(): Promise<Server> {
  const config = loadConfig();
  initializeDatabase(config);
  await query('SELECT 1');

  const app = createSimpleApp();
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.PORT, () => {
      server.off('error', reject);
      resolve();
    });
  });
  console.info(`Simple Hotel API listening on port ${config.PORT}`);
  return server;
}

const serverPromise = start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void serverPromise
      .then(async (server) => {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await closeDatabase();
      })
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        console.error('Graceful shutdown failed', error);
        process.exit(1);
      });
  });
}

serverPromise.catch(async (error: unknown) => {
  console.error('Failed to start simple hotel API', error);
  await closeDatabase();
  process.exitCode = 1;
});
