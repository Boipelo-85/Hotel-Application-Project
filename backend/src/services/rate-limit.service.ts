import { createHmac } from 'node:crypto';
import type { AppConfig } from '../config/env.js';
import { incrementRateLimit } from '../repositories/rate-limit.repository.js';
import { AppError } from '../utils/errors.js';

export async function consumeRateLimit(
  config: AppConfig,
  key: string,
  maximum: number,
  windowSeconds: number,
): Promise<void> {
  const keyHash = createHmac('sha256', config.OTP_PEPPER).update(key).digest();
  const result = await incrementRateLimit(keyHash, windowSeconds);
  if (result.rows[0].hit_count > maximum) {
    throw new AppError(429, 'Too many attempts. Try again later.', 'RATE_LIMITED');
  }
}
