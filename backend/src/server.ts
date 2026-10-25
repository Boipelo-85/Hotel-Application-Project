import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { closeDatabase, initializeDatabase } from './config/database.js';
import { loadConfig } from './config/env.js';
import { createApp } from './app.js';
import { pruneExpiredData } from './services/maintenance.service.js';
import { checkDatabaseConnection } from './repositories/database-health.repository.js';

let maintenanceTimer: NodeJS.Timeout | undefined;

async function start(): Promise<Server> {
  const config = loadConfig();
  initializeDatabase(config);
  await checkDatabaseConnection();
  await pruneExpiredData();
  maintenanceTimer = setInterval(() => {
    void pruneExpiredData().catch((error: unknown) => {
      console.error('Expired-record maintenance failed', error);
    });
  }, 60_000);
  maintenanceTimer.unref();
  const app = createApp(config);
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.PORT, () => {
      server.off('error', reject);
      resolve();
    });
  });
  console.info(`Hotel API listening on port ${config.PORT}`);
  return server;
}

const serverPromise = start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void serverPromise
      .then(async (server) => {
        if (maintenanceTimer) clearInterval(maintenanceTimer);
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
  console.error('Failed to start hotel API', error);
  await closeDatabase();
  process.exitCode = 1;
});
