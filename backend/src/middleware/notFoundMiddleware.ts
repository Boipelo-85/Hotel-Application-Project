import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';

export const notFoundMiddleware: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'Route not found', 'NOT_FOUND'));
};
