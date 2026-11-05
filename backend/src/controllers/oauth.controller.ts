import { randomBytes, timingSafeEqual } from 'node:crypto';
import { getCookie } from '../middleware/authMiddleware.js';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import passport from 'passport';

export function googleAuthController(config: AppConfig): RequestHandler {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return (_request, response) => {
      response.status(503).json({ error: 'Google OAuth is not configured' });
    };
  }
  return (request, response, next) => {
    const state = randomBytes(32).toString('hex');
    response.cookie(stateCookie(config, 'google'), state, { ...stateOptions(config), maxAge: 10 * 60 * 1000 });
    passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(request, response, next);
  };
}

export function googleCallbackController(config: AppConfig, cookieName: string): RequestHandler[] {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return [(_request, response) => {
      response.status(503).json({ error: 'Google OAuth is not configured' });
    }];
  }
  return [
    validateOAuthState(config, 'google'),
    (request, response, next) => {
      passport.authenticate('google', { session: false }, (error: unknown, result: Express.User | false) => {
        if (error || !result) {
          response.redirect(config.APP_ORIGIN + '/login?error=oauth_failed');
          return;
        }
        request.user = result;
        next();
      })(request, response, next);
    },
    (request: any, response: any) => {
      if (request.user) {
        const { user, accessToken, refreshToken } = request.user;

        // Set JWT cookies
        response.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000, // 15 minutes
          path: '/',
        });

        response.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        response.clearCookie(cookieName, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', path: '/' });

        response.redirect(`${config.APP_ORIGIN}/auth/callback?login=success`);
      } else {
        response.redirect(`${config.APP_ORIGIN}/login?error=oauth_failed`);
      }
    },
  ];
}

export function facebookAuthController(config: AppConfig): RequestHandler {
  if (!config.FACEBOOK_CLIENT_ID || !config.FACEBOOK_CLIENT_SECRET) {
    return (_request, response) => {
      response.status(503).json({ error: 'Facebook OAuth is not configured' });
    };
  }
  return (request, response, next) => {
    const state = randomBytes(32).toString('hex');
    response.cookie(stateCookie(config, 'facebook'), state, { ...stateOptions(config), maxAge: 10 * 60 * 1000 });
    passport.authenticate('facebook', { scope: ['email'], session: false, state })(request, response, next);
  };
}

export function facebookCallbackController(config: AppConfig, cookieName: string): RequestHandler[] {
  if (!config.FACEBOOK_CLIENT_ID || !config.FACEBOOK_CLIENT_SECRET) {
    return [(_request, response) => {
      response.status(503).json({ error: 'Facebook OAuth is not configured' });
    }];
  }
  return [
    validateOAuthState(config, 'facebook'),
    (request, response, next) => {
      passport.authenticate('facebook', { session: false }, (error: unknown, result: Express.User | false) => {
        if (error || !result) {
          response.redirect(config.APP_ORIGIN + '/login?error=oauth_failed');
          return;
        }
        request.user = result;
        next();
      })(request, response, next);
    },
    (request: any, response: any) => {
      if (request.user) {
        const { user, accessToken, refreshToken } = request.user;

        // Set JWT cookies
        response.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000, // 15 minutes
          path: '/',
        });

        response.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        response.clearCookie(cookieName, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', path: '/' });

        response.redirect(`${config.APP_ORIGIN}/auth/callback?login=success`);
      } else {
        response.redirect(`${config.APP_ORIGIN}/login?error=oauth_failed`);
      }
    },
  ];
}

function stateCookie(config: AppConfig, provider: string): string {
  return (config.NODE_ENV === 'production' ? '__Host-' : '') + 'oauth_state_' + provider;
}

function stateOptions(config: AppConfig) {
  return { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
}

export function validateOAuthState(config: AppConfig, provider: string): RequestHandler {
  return (request, response, next) => {
    const expected = getCookie(request.headers.cookie, stateCookie(config, provider));
    const actual = request.query.state;
    response.clearCookie(stateCookie(config, provider), stateOptions(config));
    if (!expected || typeof actual !== 'string' || !/^[a-f0-9]{64}$/.test(actual) ||
        expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      response.redirect(config.APP_ORIGIN + '/login?error=oauth_failed');
      return;
    }
    next();
  };
}
