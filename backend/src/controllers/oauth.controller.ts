import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import passport from 'passport';

export function googleAuthController(config: AppConfig): RequestHandler {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    console.log('Google OAuth: Not configured - missing credentials');
    return (_request, response) => {
      response.status(503).json({ error: 'Google OAuth is not configured' });
    };
  }
  console.log('Google OAuth: Initiating authentication');
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
      console.log('Google OAuth callback - authInfo:', request.authInfo);
      if (request.authInfo) {
        const { user, accessToken, refreshToken } = request.authInfo;

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

        // Set legacy session cookie for compatibility
        response.cookie(cookieName, accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000,
        });

        console.log('Google OAuth: Setting cookies and redirecting to success');
        response.redirect(`${config.APP_ORIGIN}/auth/callback?login=success`);
      } else {
        console.log('Google OAuth: No authInfo, redirecting to failure');
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
        const { user, accessToken, refreshToken } = request.authInfo;

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

        // Set legacy session cookie for compatibility
        response.cookie(cookieName, accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000,
        });

        response.redirect(`${config.APP_ORIGIN}/auth/callback?login=success`);
      } else {
        response.redirect(`${config.APP_ORIGIN}/login?error=oauth_failed`);
      }
    },
  ];
}
