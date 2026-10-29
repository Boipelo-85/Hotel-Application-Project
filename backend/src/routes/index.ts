import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { bookingRoutes } from './booking.routes.js';
import { authRoutes } from './auth.routes.js';
import { favouriteRoutes } from './favourite.routes.js';
import { branchRoutes } from './branch.routes.js';
import { hotelBrandRoutes } from './hotel-brand.routes.js';
import { notificationRoutes } from './notification.routes.js';
import { paymentRoutes } from './payment.routes.js';
import { reviewRoutes } from './review.routes.js';
import { roomRoutes } from './room.routes.js';
import { searchRoutes } from './search.routes.js';
import { userRoutes } from './user.routes.js';
import { adminRoutes } from './admin.routes.js';
import { geocodingRoutes } from './geocoding.routes.js';

export function apiRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  router.use('/auth', authRoutes(config, cookieName));
  router.use('/users', userRoutes(config, cookieName));
  router.use('/brand', hotelBrandRoutes(config, cookieName));
  router.use(searchRoutes());
  router.use(roomRoutes(config, cookieName));
  router.use('/branches', branchRoutes(config, cookieName));
  router.use('/bookings', bookingRoutes(config, cookieName));
  router.use('/reviews', reviewRoutes(config, cookieName));
  router.use('/favourites', favouriteRoutes(config, cookieName));
  router.use('/notifications', notificationRoutes(config, cookieName));
  router.use('/payments', paymentRoutes(config, cookieName));
  router.use('/admin', adminRoutes(config, cookieName));
  router.use('/geocode', geocodingRoutes());
  return router;
}
