import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { refreshSession, logoutUser, logoutAllSessions } from '../services/session.service.js';
import { getCookie } from '../middleware/authMiddleware.js';

export function refreshController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    const refreshToken = getCookie(request.headers.cookie, 'refresh_token');

    if (!refreshToken) {
      response.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No refresh token provided',
        },
      });
      return;
    }

    try {
      const result = await refreshSession(config, refreshToken);

      // Set new HTTP-only cookies
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
      response.status(401).json({
        error: {
          code: error.code || 'UNAUTHENTICATED',
          message: error.message || 'Invalid or expired refresh token',
        },
      });
    }
  };
}

export function logoutController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    const refreshToken = getCookie(request.headers.cookie, 'refresh_token');

    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch (error) {
        // Ignore errors during logout
      }
    }

    // Clear cookies
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie(cookieName, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.status(204).end();
  };
}

export function logoutAllController(config: AppConfig, cookieName: string): RequestHandler {
  return async (request, response) => {
    if (!request.auth) {
      response.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      await logoutAllSessions(request.auth.userId);
    } catch (error) {
      // Ignore errors during logout
    }

    // Clear cookies
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie(cookieName, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.status(204).end();
  };
}
