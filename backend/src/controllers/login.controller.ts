import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { loginUser } from '../services/login.service.js';
import type { LoginInput } from '../services/login.service.js';

export function loginController(config: AppConfig): RequestHandler {
  return async (request, response) => {
    const input: LoginInput = request.body;

    try {
      const result = await loginUser(config, input);

      // Set HTTP-only cookies for tokens
      response.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });

      response.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

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
