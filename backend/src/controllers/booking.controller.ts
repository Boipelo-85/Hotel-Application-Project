import type { RequestHandler } from 'express';
import {
  cancelBooking as cancelBookingService,
  createBooking as createBookingService,
  getBooking as getBookingService,
  listBookings,
  listHotelBookings,
  modifyBooking,
  updateBookingStatus,
} from '../services/booking.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

function authenticated(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return request.auth;
}

export const createBookingController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.status(201).json({ booking: await createBookingService(user.userId, request.body) });
};

export const listBookingsController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({ bookings: await listBookings({ id: user.userId, role: user.role }) });
};

export const getBookingController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({
    booking: await getBookingService(getRouteParam(request, 'bookingId'), { id: user.userId, role: user.role }),
  });
};

export const cancelBookingController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({
    booking: await cancelBookingService(getRouteParam(request, 'bookingId'), user.userId, user.role === 'admin'),
  });
};

export const updateBookingStatusController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({
    booking: await updateBookingStatus(getRouteParam(request, 'bookingId'), request.body.status, {
      id: user.userId,
      role: user.role,
    }),
  });
};

export const modifyBookingController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({
    booking: await modifyBooking(getRouteParam(request, 'bookingId'), { id: user.userId, role: user.role }, request.body),
  });
};

export const listHotelBookingsController: RequestHandler = async (request, response) => {
  const user = authenticated(request);
  response.json({
    bookings: await listHotelBookings(getRouteParam(request, 'hotelId'), { id: user.userId, role: user.role }),
  });
};

export const deleteBookingController = cancelBookingController;
export const getBookings = listBookingsController;
export const getBooking = getBookingController;
export const createBooking = createBookingController;
export const updateBooking = modifyBookingController;
export const cancelBooking = cancelBookingController;
