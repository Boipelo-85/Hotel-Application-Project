import type { Request } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getRouteParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== 'string') {
    throw new AppError(400, `Invalid ${name}`, 'INVALID_PARAMETER');
  }
  return value;
}

export function assertFound<T>(value: T | undefined | null, message = 'Resource not found'): T {
  if (value === undefined || value === null) {
    throw new AppError(404, message, 'NOT_FOUND');
  }
  return value;
}
