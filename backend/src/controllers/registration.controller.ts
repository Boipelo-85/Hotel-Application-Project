import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { registerUser } from '../services/registration.service.js';
import type { RegisterInput } from '../services/registration.service.js';

export function registerController(config: AppConfig): RequestHandler {
  return async (request, response) => {
    const input: RegisterInput = request.body;

    try {
      const result = await registerUser(config, input);

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

      response.status(201).json({
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
      if (error.code === 'EMAIL_EXISTS') {
        response.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: error.message,
          },
        });
        return;
      }

      response.status(400).json({
        error: {
          code: error.code || 'VALIDATION_ERROR',
          message: error.message || 'Registration failed',
        },
      });
    }
  };
}
