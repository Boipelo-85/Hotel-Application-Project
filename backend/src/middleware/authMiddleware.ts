import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { getSessionUser } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

type AuthenticatedUser = NonNullable<Parameters<RequestHandler>[0]['auth']>;
type UserRole = AuthenticatedUser['role'];

function isUserRole(role: string): role is UserRole {
  return role === 'customer' || role === 'branch_manager' || role === 'admin';
}

async function getAuthenticatedUser(token: string, config: AppConfig): Promise<AuthenticatedUser | null> {
  try {
    const claims = verifyAccessToken(token, config);
    if (claims.userId && claims.email && isUserRole(claims.role)) {
      return { userId: claims.userId, role: claims.role, email: claims.email };
    }
  } catch {
    // Legacy OTP sessions are opaque tokens, not JWTs.
  }

  const sessionUser = await getSessionUser(token);
  return sessionUser
    ? { userId: sessionUser.id, role: sessionUser.role, email: sessionUser.email }
    : null;
}

export function getCookie(requestHeader: string | undefined, name: string): string | undefined {
  if (!requestHeader) return undefined;
  const entry = requestHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!entry) return undefined;
  const value = entry.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function createAuthMiddleware(cookieName: string, config: AppConfig): RequestHandler {
  return async (request, _response, next) => {
    try {
      const accessToken = getCookie(request.headers.cookie, 'access_token');
      const sessionToken = getCookie(request.headers.cookie, cookieName);
      const tokens = [...new Set([accessToken, sessionToken].filter((token): token is string => Boolean(token)))];
      if (tokens.length === 0) {
        next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
        return;
      }

      for (const token of tokens) {
        const user = await getAuthenticatedUser(token, config);
        if (user) {
          request.auth = user;
          next();
          return;
        }
      }

      next(new AppError(401, 'Session is invalid or expired', 'UNAUTHENTICATED'));
    } catch (error) {
      next(error);
    }
  };
}

export function createOptionalAuthMiddleware(cookieName: string, config: AppConfig): RequestHandler {
  return async (request, _response, next) => {
    try {
      const accessToken = getCookie(request.headers.cookie, 'access_token');
      const sessionToken = getCookie(request.headers.cookie, cookieName);
      const tokens = [...new Set([accessToken, sessionToken].filter((token): token is string => Boolean(token)))];
      if (tokens.length === 0) {
        next();
        return;
      }

      for (const token of tokens) {
        const user = await getAuthenticatedUser(token, config);
        if (user) {
          request.auth = user;
          next();
          return;
        }
      }

      next(new AppError(401, 'Session is invalid or expired', 'UNAUTHENTICATED'));
    } catch (error) {
      next(error);
    }
  };
}

export function createSameOriginMiddleware(appOrigin: string): RequestHandler {
  return (request, _response, next) => {
    const origin = request.get('origin');
    if (!origin || origin !== appOrigin) {
      next(new AppError(403, 'Request origin is not allowed', 'INVALID_ORIGIN'));
      return;
    }
    next();
  };
}
