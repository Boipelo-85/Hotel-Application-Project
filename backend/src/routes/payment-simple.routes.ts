import { Router } from 'express';
import {
  createPaymentController,
  getPaymentsByBookingController,
} from '../controllers/payment-simple.controller.js';

export function paymentSimpleRoutes(): Router {
  const router = Router();
  router.post('/', createPaymentController);
  router.get('/:bookingId', getPaymentsByBookingController);
  return router;
}
