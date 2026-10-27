import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import passport from 'passport';

export function googleAuthController(config: AppConfig): RequestHandler {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return (_request, response) => {
      response.status(503).json({ error: 'Google OAuth is not configured' });
    };
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] }) as RequestHandler;
}

export function googleCallbackController(config: AppConfig, cookieName: string): RequestHandler[] {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return [(_request, response) => {
      response.status(503).json({ error: 'Google OAuth is not configured' });
    }];
  }
  return [
    passport.authenticate('google', { failureRedirect: `${config.APP_ORIGIN}/login?error=oauth_failed` }) as RequestHandler,
    (request: any, response: any) => {
      if (request.authInfo) {
        response.cookie(cookieName, request.authInfo.token, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
        });
        response.redirect(`${config.APP_ORIGIN}/?login=success`);
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
  return passport.authenticate('facebook', { scope: ['email'] }) as RequestHandler;
}

export function facebookCallbackController(config: AppConfig, cookieName: string): RequestHandler[] {
  if (!config.FACEBOOK_CLIENT_ID || !config.FACEBOOK_CLIENT_SECRET) {
    return [(_request, response) => {
      response.status(503).json({ error: 'Facebook OAuth is not configured' });
    }];
  }
  return [
    passport.authenticate('facebook', { failureRedirect: `${config.APP_ORIGIN}/login?error=oauth_failed` }) as RequestHandler,
    (request: any, response: any) => {
      if (request.authInfo) {
        response.cookie(cookieName, request.authInfo.token, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: config.SESSION_TTL_HOURS * 60 * 60 * 1000,
        });
        response.redirect(`${config.APP_ORIGIN}/?login=success`);
      } else {
        response.redirect(`${config.APP_ORIGIN}/login?error=oauth_failed`);
      }
    },
  ];
}
