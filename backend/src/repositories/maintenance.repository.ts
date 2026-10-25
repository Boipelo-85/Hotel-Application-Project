import type { PoolClient } from 'pg';

export async function deleteExpiredRateLimits(client: PoolClient) {
  return client.query(
    `DELETE FROM auth_rate_limits
     WHERE window_started_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`,
  );
}

export async function cancelExpiredBookings(client: PoolClient) {
  return client.query(
    `UPDATE bookings SET status = 'cancelled', expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE status = 'pending' AND expires_at <= CURRENT_TIMESTAMP`,
  );
}
