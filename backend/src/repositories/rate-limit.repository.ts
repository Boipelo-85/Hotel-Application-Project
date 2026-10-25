import { query } from '../config/database.js';

export async function incrementRateLimit(keyHash: Buffer, windowSeconds: number) {
  return query<{ hit_count: number }>(
    `INSERT INTO auth_rate_limits (key_hash, window_started_at, hit_count)
     VALUES ($1, CURRENT_TIMESTAMP, 1)
     ON CONFLICT (key_hash) DO UPDATE
     SET hit_count = CASE
           WHEN auth_rate_limits.window_started_at <= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 second') THEN 1
           ELSE auth_rate_limits.hit_count + 1
         END,
         window_started_at = CASE
           WHEN auth_rate_limits.window_started_at <= CURRENT_TIMESTAMP - ($2 * INTERVAL '1 second')
             THEN CURRENT_TIMESTAMP
           ELSE auth_rate_limits.window_started_at
         END
     RETURNING hit_count`,
    [keyHash, windowSeconds],
  );
}
