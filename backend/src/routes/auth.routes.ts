import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware, createSameOriginMiddleware } from '../middleware/authMiddleware.js';
import { createRateLimitMiddleware } from '../middleware/rateLimitMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import {
  currentUserController,
  logoutController as otpLogoutController,
  requestCodeController,
  verifyCodeController,
} from '../controllers/auth.controller.js';
import { registerController } from '../controllers/registration.controller.js';
import { loginController } from '../controllers/login.controller.js';
import {
  refreshController,
  logoutController,
  logoutAllController,
} from '../controllers/session.controller.js';
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

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  phone: z.string().trim().regex(/^(\+27|0)[0-9]{9}$/).optional(),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1),
}).strict();

export function authRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  const sameOrigin = createSameOriginMiddleware(config.APP_ORIGIN);

  // Development mode: relaxed rate limits
  const isDev = config.NODE_ENV === 'development';
  const requestCodeLimit = isDev ? 100 : 8;
  const verifyCodeLimit = isDev ? 100 : 10;
  const authLimit = isDev ? 100 : 5;
  const windowSeconds = isDev ? 60 : 15 * 60;

  // Email/Password Registration
  router.post(
    '/register',
    sameOrigin,
    createRateLimitMiddleware(config, 'auth:register-ip', authLimit, windowSeconds),
    validateBody(registerSchema),
    registerController(config),
  );

  // Email/Password Login
  router.post(
    '/login',
    sameOrigin,
    createRateLimitMiddleware(config, 'auth:login-ip', authLimit, windowSeconds),
    validateBody(loginSchema),
    loginController(config),
  );

  // Refresh Token
  router.post(
    '/refresh',
    refreshController(config, cookieName),
  );

  // Logout (JWT)
  router.post(
    '/logout',
    logoutController(config, cookieName),
  );

  // Logout All Sessions
  router.post(
    '/logout-all',
    createAuthMiddleware(cookieName),
    logoutAllController(config, cookieName),
  );

  // Email OTP Authentication (legacy)
  router.post(
    '/request-code',
    sameOrigin,
    createRateLimitMiddleware(config, 'otp:request-ip', requestCodeLimit, windowSeconds),
    validateBody(requestCodeSchema),
    requestCodeController(config),
  );
  router.post(
    '/verify-code',
    sameOrigin,
    createRateLimitMiddleware(config, 'otp:verify-ip', verifyCodeLimit, windowSeconds),
    validateBody(verifyCodeSchema),
    verifyCodeController(config, cookieName),
  );

  // Google OAuth
  router.get('/google', googleAuthController(config));
  router.get('/google/callback', ...googleCallbackController(config, cookieName));

  // Facebook OAuth
  router.get('/facebook', facebookAuthController(config));
  router.get('/facebook/callback', ...facebookCallbackController(config, cookieName));

  // Legacy OTP logout
  router.post('/otp-logout', sameOrigin, createAuthMiddleware(cookieName), otpLogoutController(config, cookieName));
  
  // Get current user
  router.get('/me', createAuthMiddleware(cookieName), currentUserController);
  
  return router;
}
