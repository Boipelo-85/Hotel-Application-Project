import jwt from 'jsonwebtoken';
import type { RequestHandler, Response } from 'express';
import type { AppConfig } from '../config/env.js';
import { getCookie } from './authMiddleware.js';
import { findBookingById } from '../repositories/booking.repository.js';
import { AppError, getRouteParam } from '../utils/errors.js';

const cookieName = (id: string) => `guest_booking_${id}`;

export function grantGuestBooking(response: Response, config: AppConfig, bookingId: string): void {
  response.cookie(cookieName(bookingId), jwt.sign({ bookingId, purpose: 'guest-booking' }, config.JWT_SECRET, {
    expiresIn: '24h', audience: 'guest-booking', algorithm: 'HS256',
  }), {
    httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax',
    path: '/api/v1/guest-bookings', maxAge: 86_400_000,
  });
}

export function requireGuestBooking(config: AppConfig): RequestHandler {
  return async (request, _response, next) => {
    const bookingId = getRouteParam(request, 'bookingId');
    const token = getCookie(request.headers.cookie, cookieName(bookingId));
    try {
      const claims = jwt.verify(token ?? '', config.JWT_SECRET, { audience: 'guest-booking', algorithms: ['HS256'] });
      if (typeof claims === 'string' || claims.purpose !== 'guest-booking' || claims.bookingId !== bookingId) throw new Error();
    } catch {
      throw new AppError(401, 'Find your booking using its reference and email to continue.', 'GUEST_ACCESS_REQUIRED');
    }
    const booking = (await findBookingById(bookingId)).rows[0];
    if (!booking || booking.user_id !== null) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    next();
  };
}
