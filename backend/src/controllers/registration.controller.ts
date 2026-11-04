import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { registerUser } from '../services/registration.service.js';
import type { RegisterInput } from '../services/registration.service.js';
import { AppError } from '../utils/errors.js';

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
    } catch (error: unknown) {
      const errorCode = typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
      const errorMessage = error instanceof Error ? error.message : '';

      if (errorCode === 'EMAIL_EXISTS') {
        response.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: errorMessage,
          },
        });
        return;
      }

      if (
        errorCode === '42703' &&
        /column .*?\b(?:password_hash|oauth_provider|oauth_id)\b.* does not exist/i.test(errorMessage)
      ) {
        response.status(503).json({
          error: {
            code: 'AUTH_SCHEMA_NOT_CONFIGURED',
            message: 'Account creation is not configured in the database. A database administrator must apply database/migrations/008_add_password_hash.sql.',
          },
        });
        return;
      }

      if (error instanceof AppError) {
        response.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      console.error('Account registration failed', error);
      response.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Unable to create the account. Please try again.',
        },
      });
    }
  };
}
