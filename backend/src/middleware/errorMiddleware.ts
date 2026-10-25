import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.code, message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  const requestParsingError = error as { type?: string };
  if (requestParsingError.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'INVALID_JSON', message: 'Request body must contain valid JSON' });
    return;
  }
  if (requestParsingError.type === 'entity.too.large') {
    response.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size' });
    return;
  }

  const databaseError = error as { code?: string };
  if (databaseError.code === '23505') {
    response.status(409).json({ error: 'CONFLICT', message: 'A resource with these details already exists' });
    return;
  }
  if (databaseError.code === '23503' || databaseError.code === '23514' || databaseError.code === '22P02') {
    response.status(400).json({ error: 'INVALID_DATA', message: 'The request contains invalid data' });
    return;
  }
  if (databaseError.code === '40001' || databaseError.code === '40P01') {
    response.status(409).json({ error: 'RETRY_TRANSACTION', message: 'The request conflicted with another operation; retry it' });
    return;
  }

  console.error('Unhandled request error', error);
  response.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
};
