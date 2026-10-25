import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  }

  if (request.auth.role !== 'admin') {
    return next(new AppError(403, 'Admin access required', 'FORBIDDEN'));
  }

  next();
};

export function requireRoles(...roles: Array<'customer' | 'hotel_partner' | 'admin'>): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
      return;
    }
    if (!roles.includes(request.auth.role)) {
      next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
