import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { loginUser } from '../services/login.service.js';
import type { LoginInput } from '../services/login.service.js';

export function loginController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    const input: LoginInput = request.body;

    try {
      const result = await loginUser(config, input);

      const cookieOptions = {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      if ('token' in result) {
        response.clearCookie('access_token', cookieOptions);
        response.clearCookie('refresh_token', cookieOptions);
        response.cookie(cookieName, result.token, {
          ...cookieOptions,
          maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
        });
      } else {
        response.clearCookie(cookieName, cookieOptions);
        response.cookie('access_token', result.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        response.cookie('refresh_token', result.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      }

      response.status(200).json({
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          email_verified: result.user.email_verified,
          phone: result.user.phone,
        },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 401;
      response.status(statusCode).json({
        error: {
          code: error.code || 'INVALID_PASSWORD',
          message: error.message || 'Invalid email or password',
        },
      });
    }
  };
}
