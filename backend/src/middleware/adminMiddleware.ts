import type { RequestHandler } from 'express';
import type { UserRole } from '../types/models.js';
import { AppError } from '../utils/errors.js';

export const requireAdmin: RequestHandler = ( request,_response,next,) => {
  if (!request.auth) {
    return next(
      new AppError(
        401,
        'Authentication required',
        'UNAUTHORIZED',
      ),
    );
  }

  if (request.auth.role !== 'admin') {
    return next(
      new AppError(
        403,
        'Admin access required',
        'FORBIDDEN',
      ),
    );
  }

  next();
};

export function requireRoles(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      return next(
        new AppError(
          401,
          'Authentication required',
          'UNAUTHORIZED',
        ),
      );
    }

    if (!roles.includes(request.auth.role)) {
      return next(
        new AppError(
          403,
          'You do not have permission to perform this action',
          'FORBIDDEN',
        ),
      );
    }

    next();
  };
}