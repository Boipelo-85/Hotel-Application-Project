import type { RequestHandler } from 'express';
import {
  createBooking,
  findBookingById,
  findAllBookings,
  findBookingsByUserId,
  updateBookingStatus,
  deleteBooking,
} from '../repositories/booking-simple.repository.js';
import type { BookingInput } from '../types/models.js';

export const listBookingsController: RequestHandler = async (request, response) => {
  const bookings = await findAllBookings();
  response.json({ bookings });
};

export const createBookingController: RequestHandler = async (request, response) => {
  const booking = await createBooking(request.body as BookingInput);
  response.status(201).json({ booking });
};

export const deleteBookingController: RequestHandler = async (request, response) => {
  const booking_id = parseInt(request.params.id);
  if (isNaN(booking_id)) {
    return response.status(400).json({ error: 'Invalid booking ID' });
  }

  const deleted = await deleteBooking(booking_id);
  if (!deleted) {
    return response.status(404).json({ error: 'Booking not found' });
  }

  response.status(204).end();
};
