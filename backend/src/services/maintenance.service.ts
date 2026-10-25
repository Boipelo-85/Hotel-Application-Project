import { inTransaction } from '../config/database.js';
import { deleteExpiredAuthCodes } from '../repositories/auth.repository.js';
import {
  cancelExpiredBookings,
  deleteExpiredRateLimits,
} from '../repositories/maintenance.repository.js';
import { deleteExpiredSessions } from '../repositories/session.repository.js';

export async function pruneExpiredData(): Promise<void> {
  await inTransaction(async (client) => {
    await deleteExpiredAuthCodes(client);
    await deleteExpiredSessions(client);
    await deleteExpiredRateLimits(client);
    await cancelExpiredBookings(client);
  });
}
