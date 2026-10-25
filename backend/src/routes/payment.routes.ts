import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { getPayment, handleWebhook, initiatePayment, refundBookingController } from '../controllers/payment.controller.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

export function paymentRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.post('/webhook', handleWebhook);
  router.use(auth);
  router.post(
    '/',
    validateBody(z.object({ bookingId: z.string().regex(/^\d+$/) }).strict()),
    initiatePayment,
  );
  router.get(
    '/:paymentId',
    validateParams(z.object({ paymentId: z.string().regex(/^\d+$/) })),
    getPayment,
  );
  router.post(
    '/bookings/:bookingId/checkout',
    validateParams(z.object({ bookingId: z.string().regex(/^\d+$/) })),
    initiatePayment,
  );
  router.post(
    '/bookings/:bookingId/refund',
    requireAdmin,
    validateParams(z.object({ bookingId: z.string().regex(/^\d+$/) })),
    refundBookingController,
  );
  return router;
}
