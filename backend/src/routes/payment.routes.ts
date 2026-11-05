import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import { getPayment, handleWebhook, initiatePayment, verifyPayment } from '../controllers/payment.controller.js';

export function paymentRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName, _config);
  router.post('/webhook', handleWebhook);
  router.use(auth);
  router.post(
    '/',
    validateBody(z.object({
      bookingId: z.string().regex(/^\d+$/),
      paymentMethod: z.enum(['card', 'eft']),
    }).strict()),
    initiatePayment,
  );
  router.get(
    '/verify/:reference',
    validateParams(z.object({ reference: z.string().regex(/^[A-Za-z0-9.=-]{1,100}$/) })),
    verifyPayment,
  );
  router.get(
    '/:paymentId',
    validateParams(z.object({ paymentId: z.string().regex(/^\d+$/) })),
    getPayment,
  );
  router.post(
    '/bookings/:bookingId/checkout',
    validateParams(z.object({ bookingId: z.string().regex(/^\d+$/) })),
    validateBody(z.object({ paymentMethod: z.enum(['card', 'eft']) }).strict()),
    initiatePayment,
  );
  return router;
}
