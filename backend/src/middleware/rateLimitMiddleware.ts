import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { consumeRateLimit } from '../services/rate-limit.service.js';

export function createRateLimitMiddleware(
  config: AppConfig,
  action: string,
  maximum: number,
  windowSeconds: number,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      await consumeRateLimit(config, `${action}:ip:${request.ip ?? 'unknown'}`, maximum, windowSeconds);
      next();
    } catch (error) {
      next(error);
    }
  };
}
