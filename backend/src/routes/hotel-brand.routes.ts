import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { getHotelBrandController } from '../controllers/hotel-brand.controller.js';

export function hotelBrandRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  router.get('/', getHotelBrandController);
  return router;
}
