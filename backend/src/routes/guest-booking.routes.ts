import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireGuestBooking } from '../middleware/guestBookingMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { createRateLimitMiddleware } from '../middleware/rateLimitMiddleware.js';
import { findBookingById } from '../repositories/booking.repository.js';
import { cancelBooking } from '../services/booking.service.js';
import { createCheckout, requestBookingRefund, verifyPaymentReference } from '../services/payment.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

export function guestBookingRoutes(config: AppConfig): Router {
  const router = Router();
  router.use('/:bookingId', validateParams(z.object({ bookingId: z.string().regex(/^\d+$/) })),
    createRateLimitMiddleware(config, 'booking:guest-actions', 60, 15 * 60), requireGuestBooking(config));
  router.get('/:bookingId', async (req, res) => {
    const booking = (await findBookingById(getRouteParam(req, 'bookingId'))).rows[0]!;
    const { manager_user_id: _manager, ...publicBooking } = booking;
    res.json({ booking: publicBooking });
  });
  router.post('/:bookingId/checkout', validateBody(z.object({ paymentMethod: z.enum(['card', 'eft']) }).strict()), async (req, res) => {
    const id = getRouteParam(req, 'bookingId');
    const key = req.get('idempotency-key');
    if (!key || !/^[A-Za-z0-9._:-]{8,120}$/.test(key)) throw new AppError(400, 'A valid Idempotency-Key is required', 'INVALID_IDEMPOTENCY_KEY');
    const booking = (await findBookingById(id)).rows[0]!;
    const result = await createCheckout(null, id, key, req.body.paymentMethod, booking.guest_email!, id);
    res.json({ checkoutUrl: result.checkoutUrl });
  });
  router.post('/:bookingId/verify', validateBody(z.object({ reference: z.string().regex(/^[A-Za-z0-9.=-]{1,100}$/) }).strict()), async (req, res) => {
    res.json(await verifyPaymentReference(req.body.reference, null, getRouteParam(req, 'bookingId')));
  });
  router.post('/:bookingId/cancel', async (req, res) => {
    const id = getRouteParam(req, 'bookingId');
    const booking = (await findBookingById(id)).rows[0]!;
    if (booking.status === 'confirmed') {
      if (booking.check_in <= new Date().toISOString().slice(0, 10)) throw new AppError(409, 'Contact the hotel to cancel a stay that has started.', 'INVALID_BOOKING_STATE');
      res.status(202).json(await requestBookingRefund(id, 'guest-cancellation', id));
      return;
    }
    res.json({ booking: await cancelBooking(id, null, false) });
  });
  return router;
}
