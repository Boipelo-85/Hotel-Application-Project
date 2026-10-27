import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import type { AppConfig } from './env.js';
import { inTransaction } from '../config/database.js';
import { upsertVerifiedUser } from '../repositories/user.repository.js';
import { hashSessionToken } from '../utils/session.js';
import { createSession as persistSession } from '../repositories/session.repository.js';

export function configurePassport(config: AppConfig): void {
  // Google OAuth Strategy
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          callbackURL: config.GOOGLE_CALLBACK_URL || `${config.APP_ORIGIN}/api/v1/auth/google/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, result?: any) => void) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email in Google profile'));
            }

            const result = await inTransaction(async (client) => {
              const userResult = await upsertVerifiedUser(
                client,
                email.toLowerCase(),
                profile.displayName || email.split('@')[0],
                true
              );
              const user = userResult.rows[0];

              const token = Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
              await persistSession(client, hashSessionToken(token), user.id, config.SESSION_TTL_HOURS);

              return { user, token };
            });

            done(null, result);
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

            const result = await inTransaction(async (client) => {
              const userResult = await upsertVerifiedUser(
                client,
                email.toLowerCase(),
                profile.displayName || email.split('@')[0],
                true
              );
              const user = userResult.rows[0];

              const token = Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
              await persistSession(client, hashSessionToken(token), user.id, config.SESSION_TTL_HOURS);

              return { user, token };
            });

            done(null, result);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((data: any, done) => {
    done(null, data);
  });

  passport.deserializeUser((data: any, done) => {
    done(null, data);
  });
}
