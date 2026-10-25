import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    request.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      next(result.error);
      return;
    }
    next();
  };
}

export function validateQuery<T extends Record<string, unknown>>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    request.validatedQuery = result.data;
    next();
  };
}
