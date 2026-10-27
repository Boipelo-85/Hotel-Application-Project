import type { RequestHandler } from 'express';
import {
  cancelBooking,
  createBooking,
  listBookings,
} from '../services/booking.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

function authenticated(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return request.auth;
}

export const listBookingsController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  const bookings = await listBookings({ id: user.userId, role: user.role });
  response.json({ bookings });
};

export const createBookingController: RequestHandler = async (request, response) => {
  const booking = await createBooking(request.auth?.userId ?? null, request.body);
  response.status(201).json({ booking });
};

export const deleteBookingController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  await cancelBooking(getRouteParam(request, 'id'), user.userId, user.role === 'admin');
  response.status(204).end();
};
