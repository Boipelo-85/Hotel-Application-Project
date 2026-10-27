import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware, createSameOriginMiddleware } from '../middleware/authMiddleware.js';
import { createRateLimitMiddleware } from '../middleware/rateLimitMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import {
  currentUserController,
  logoutController,
  requestCodeController,
  verifyCodeController,
} from '../controllers/auth.controller.js';
import {
  facebookAuthController,
  facebookCallbackController,
  googleAuthController,
  googleCallbackController,
} from '../controllers/oauth.controller.js';

const requestCodeSchema = z.object({
  email: z.string().trim().email().max(320),
}).strict();

const verifyCodeSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().trim().max(120).optional(),
}).strict();

export function authRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  const sameOrigin = createSameOriginMiddleware(config.APP_ORIGIN);

  // Email OTP Authentication
  router.post(
    '/request-code',
    sameOrigin,
    createRateLimitMiddleware(config, 'otp:request-ip', 8, 15 * 60),
    validateBody(requestCodeSchema),
    requestCodeController(config),
  );
  router.post(
    '/verify-code',
    sameOrigin,
    createRateLimitMiddleware(config, 'otp:verify-ip', 10, 15 * 60),
    validateBody(verifyCodeSchema),
    verifyCodeController(config, cookieName),
  );

  // Google OAuth
  router.get('/google', googleAuthController(config));
  router.get('/google/callback', ...googleCallbackController(config, cookieName));

  // Facebook OAuth
  router.get('/facebook', facebookAuthController(config));
  router.get('/facebook/callback', ...facebookCallbackController(config, cookieName));

  router.post('/logout', sameOrigin, createAuthMiddleware(cookieName), logoutController(config, cookieName));
  router.get('/me', createAuthMiddleware(cookieName), currentUserController);
  return router;
}
