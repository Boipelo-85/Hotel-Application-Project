import type { Request } from 'express';

export type ErrorCode =
  | 'ACCOUNT_DEACTIVATED'
  | 'ALREADY_PAID'
  | 'BOOKING_EXPIRED'
  | 'CAPACITY_EXCEEDED'
  | 'CAPACITY_RESERVED'
  | 'EMAIL_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'INVALID_AMENITIES'
  | 'INVALID_AMOUNT'
  | 'INVALID_BOOKING_STATE'
  | 'INVALID_BRANCH_MANAGER'
  | 'INVALID_CODE'
  | 'INVALID_DATA'
  | 'INVALID_DATES'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'INVALID_ORIGIN'
  | 'INVALID_PAYMENT_EVENT'
  | 'INVALID_PAYMENT_STATE'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INVALID_QUANTITY'
  | 'INVALID_WEBHOOK_BODY'
  | 'INVENTORY_RESERVED'
  | 'NOT_FOUND'
  | 'INVALID_PARAMETER'
  | 'NO_INVENTORY'
  | 'PAYMENTS_UNAVAILABLE'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_IN_PROGRESS'
  | 'PAYMENT_MISMATCH'
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_PROVIDER_CONFLICT'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_STATE_CHANGED'
  | 'RATE_LIMITED'
  | 'REFUND_IN_PROGRESS'
  | 'REFUND_UNAVAILABLE'
  | 'REVIEW_NOT_ALLOWED'
  | 'ROOM_NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: ErrorCode,
  ) {
    super(message);

    this.name = 'AppError';

    Error.captureStackTrace?.(this, AppError);
  }
}

export function getRouteParam(
  request: Request,
  name: string,
): string {
  const value = request.params[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(
      400,
      `Invalid ${name}`,
      'INVALID_PARAMETER',
    );
  }

  return value;
}

export function assertFound<T>(
  value: T | undefined | null,
  message = 'Resource not found',
): T {
  if (value === undefined || value === null) {
    throw new AppError(
      404,
      message,
      'NOT_FOUND',
    );
  }

  return value;
}

export function assertAuthorized(
  condition: boolean,
  message = 'Unauthorized',
): void {
  if (!condition) {
    throw new AppError(
      401,
      message,
      'UNAUTHORIZED',
    );
  }
}

export function assertForbidden(
  condition: boolean,
  message = 'Forbidden',
): void {
  if (!condition) {
    throw new AppError(
      403,
      message,
      'FORBIDDEN',
    );
  }
}