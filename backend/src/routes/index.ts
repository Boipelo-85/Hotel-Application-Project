import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { bookingRoutes } from './booking.routes.js';
import { authRoutes } from './auth.routes.js';
import { favouriteRoutes } from './favourite.routes.js';
import { hotelRoutes } from './hotel.routes.js';
import { notificationRoutes } from './notification.routes.js';
import { paymentRoutes } from './payment.routes.js';
import { reviewRoutes } from './review.routes.js';
import { roomRoutes } from './room.routes.js';
import { userRoutes } from './user.routes.js';

export function apiRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  router.use('/auth', authRoutes(config, cookieName));
  router.use('/users', userRoutes(config, cookieName));
  router.use('/hotels', hotelRoutes(config, cookieName));
  router.use('/rooms', roomRoutes(config, cookieName));
  router.use('/bookings', bookingRoutes(config, cookieName));
  router.use('/reviews', reviewRoutes(config, cookieName));
  router.use('/favourites', favouriteRoutes(config, cookieName));
  router.use('/notifications', notificationRoutes(config, cookieName));
  router.use('/payments', paymentRoutes(config, cookieName));
  return router;
}
