import { Router } from 'express';
import { authSimpleRoutes } from './auth-simple.routes.js';
import { roomSimpleRoutes } from './room-simple.routes.js';
import { bookingSimpleRoutes } from './booking-simple.routes.js';
import { paymentSimpleRoutes } from './payment-simple.routes.js';

export function apiSimpleRoutes(): Router {
  const router = Router();
  router.use('/auth', authSimpleRoutes());
  router.use('/rooms', roomSimpleRoutes());
  router.use('/bookings', bookingSimpleRoutes());
  router.use('/payments', paymentSimpleRoutes());
  return router;
}
