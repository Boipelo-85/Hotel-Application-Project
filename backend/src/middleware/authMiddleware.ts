import type { RequestHandler } from 'express';
import { getSessionUser } from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';

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

export function createAuthMiddleware(cookieName: string): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = getCookie(request.headers.cookie, cookieName);
      if (!token) {
        next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
        return;
      }
      const user = await getSessionUser(token);
      if (!user) {
        next(new AppError(401, 'Session is invalid or expired', 'UNAUTHENTICATED'));
        return;
      }
      request.auth = { userId: user.id, role: user.role, email: user.email };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createOptionalAuthMiddleware(cookieName: string): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = getCookie(request.headers.cookie, cookieName);
      if (!token) {
        next();
        return;
      }

      const user = await getSessionUser(token);
      if (!user) {
        next(new AppError(401, 'Session is invalid or expired', 'UNAUTHENTICATED'));
        return;
      }

      request.auth = { userId: user.id, role: user.role, email: user.email };
      next();
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
