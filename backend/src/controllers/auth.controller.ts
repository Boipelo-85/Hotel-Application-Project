import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { getCookie } from '../middleware/authMiddleware.js';
import { AppError } from '../utils/errors.js';
import { requestVerificationCode, revokeSession, verifyCodeAndCreateSession } from '../services/auth.service.js';
import { getUserProfile } from '../services/user.service.js';

export function requestCodeController(config: AppConfig): RequestHandler {
  return async (request, response) => {
    const email = request.body.email;
    console.log(`Request code for email: ${email}, IP: ${request.ip ?? 'unknown'}`);
    try {
      await requestVerificationCode(config, email, request.ip ?? 'unknown');
      console.log(`Code request successful for email: ${email}`);
      response.status(202).json({ message: 'If the address can receive a code, one has been sent.' });
    } catch (error: any) {
      console.error(`Request code failed for email ${email}:`, error);
      response.status(500).json({ error: error.message || 'Failed to send code' });
    }
  };
}

export function verifyCodeController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    const { email, code, name } = request.body as { email: string; code: string; name?: string };
    const session = await verifyCodeAndCreateSession(config, email, code, name);
    response.cookie(cookieName, session.token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
    });
    response.status(200).json({ user: session.user });
  };
}

export function logoutController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    const token = getCookie(request.headers.cookie, cookieName);
    if (token) await revokeSession(token);
    response.clearCookie(cookieName, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  };
}

export const currentUserController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({ user: await getUserProfile(request.auth.userId) });
};
