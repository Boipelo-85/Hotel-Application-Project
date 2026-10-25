import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import {
  cancelBookingController,
  createBooking,
  deleteBookingController,
  getBooking,
  listHotelBookingsController,
  getBookings,
  updateBooking,
  updateBookingStatusController,
} from '../controllers/booking.controller.js';

const idParams = z.object({ bookingId: z.string().regex(/^\d+$/) });
const createBookingSchema = z.object({
  roomId: z.string().regex(/^\d+$/),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(1000),
  quantity: z.number().int().min(1).max(1000).default(1),
}).strict();
const statusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
}).strict();
const bookingChangesSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().min(1).max(1000).optional(),
  quantity: z.number().int().min(1).max(1000).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required');

export function bookingRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.use(auth);
  router.post('/', validateBody(createBookingSchema), createBooking);
  router.get('/', getBookings);
  router.get('/:bookingId', validateParams(idParams), getBooking);
  router.get(
    '/hotels/:hotelId',
    requireRoles('admin', 'hotel_partner'),
    validateParams(z.object({ hotelId: z.string().regex(/^\d+$/) })),
    listHotelBookingsController,
  );
  router.post(
    '/:bookingId/cancel',
    validateParams(idParams),
    cancelBookingController,
  );
  router.delete('/:bookingId', validateParams(idParams), deleteBookingController);
  router.patch(
    '/:bookingId/status',
    requireRoles('admin', 'hotel_partner'),
    validateParams(idParams),
    validateBody(statusSchema),
    updateBookingStatusController,
  );
  router.patch(
    '/:bookingId',
    validateParams(idParams),
    validateBody(bookingChangesSchema),
    updateBooking,
  );
  return router;
}
