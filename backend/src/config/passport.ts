import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import type { AppConfig } from './env.js';
import { inTransaction } from '../config/database.js';
import { findUserByOAuth, findUserByEmail, createUserWithOAuth } from '../repositories/user.repository.js';
import { createRefreshToken } from '../repositories/refresh-token.repository.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import type { AuthenticatedUser } from '../types/models.js';

export function configurePassport(config: AppConfig): void {
  // Google OAuth Strategy
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    const callbackURL = config.GOOGLE_CALLBACK_URL || `${config.APP_ORIGIN}/api/v1/auth/google/callback`;
    console.log(`Google OAuth configured with callback URL: ${callbackURL}`);
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          callbackURL,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, result?: any) => void) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email in Google profile'));
            }

            if (profile._json?.email_verified !== true) {
              return done(new Error('Google email is not verified'));
            }
            const googleId = profile.id;
            const normalizedEmail = email.toLowerCase();

            const result = await inTransaction(async (client) => {
              // Check if user already exists with this Google account
              const existingOAuthUser = await findUserByOAuth(client, 'google', googleId);
              if (existingOAuthUser.rows.length > 0) {
                const user = existingOAuthUser.rows[0];
                if (!user.is_active) {
                  throw new Error('Account has been deactivated');
                }
                return { user, isNew: false };
              }

              // Check if user exists with this email (password account)
              const existingEmailUser = await findUserByEmail(client, normalizedEmail);
              if (existingEmailUser.rows.length > 0) {
                const user = existingEmailUser.rows[0];
                if (!user.is_active) {
                  throw new Error('Account has been deactivated');
                }
                // Require an authenticated linking flow rather than matching emails.
                throw new Error('Sign in with the existing account method');
              }

              // Create new user with Google OAuth
              const newUserResult = await createUserWithOAuth(
                client,
                profile.displayName || normalizedEmail.split('@')[0],
                normalizedEmail,
                'google',
                googleId,
              );
              const user = newUserResult.rows[0];
              return { user, isNew: true };
            });

            // Generate JWT tokens
            const accessToken = generateAccessToken(
              { userId: result.user.id, email: result.user.email, role: result.user.role },
              config,
            );
            const refreshToken = generateRefreshToken(result.user.id, config);

            // Store refresh token in database
            await inTransaction(async (client) => {
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7);
              await createRefreshToken(client, result.user.id, refreshToken, expiresAt);
            });

            done(null, { user: result.user, accessToken, refreshToken, isNew: result.isNew });
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }

  // Facebook OAuth Strategy
  if (config.FACEBOOK_CLIENT_ID && config.FACEBOOK_CLIENT_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.FACEBOOK_CLIENT_ID,
          clientSecret: config.FACEBOOK_CLIENT_SECRET,
          callbackURL: config.FACEBOOK_CALLBACK_URL || `${config.APP_ORIGIN}/api/v1/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails'],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, result?: any) => void) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email in Facebook profile'));
            }

            const facebookId = profile.id;
            const normalizedEmail = email.toLowerCase();

            const result = await inTransaction(async (client) => {
              // Check if user already exists with this Facebook account
              const existingOAuthUser = await findUserByOAuth(client, 'facebook', facebookId);
              if (existingOAuthUser.rows.length > 0) {
                const user = existingOAuthUser.rows[0];
                if (!user.is_active) {
                  throw new Error('Account has been deactivated');
                }
                return { user, isNew: false };
              }

              // Check if user exists with this email (password account)
              const existingEmailUser = await findUserByEmail(client, normalizedEmail);
              if (existingEmailUser.rows.length > 0) {
                const user = existingEmailUser.rows[0];
                if (!user.is_active) {
                  throw new Error('Account has been deactivated');
                }
                // Require an authenticated linking flow rather than matching emails.
                throw new Error('Sign in with the existing account method');
              }

              // Create new user with Facebook OAuth
              const newUserResult = await createUserWithOAuth(
                client,
                profile.displayName || normalizedEmail.split('@')[0],
                normalizedEmail,
                'facebook',
                facebookId,
              );
              const user = newUserResult.rows[0];
              return { user, isNew: true };
            });

            // Generate JWT tokens
            const accessToken = generateAccessToken(
              { userId: result.user.id, email: result.user.email, role: result.user.role },
              config,
            );
            const refreshToken = generateRefreshToken(result.user.id, config);

            // Store refresh token in database
            await inTransaction(async (client) => {
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7);
              await createRefreshToken(client, result.user.id, refreshToken, expiresAt);
            });

            done(null, { user: result.user, accessToken, refreshToken, isNew: result.isNew });
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }

}
