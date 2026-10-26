import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import {
  getHotelBrandController,
  updateHotelBrandController,
} from '../controllers/hotel-brand.controller.js';

const hotelBrandSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
  starRating: z.number().min(1).max(5).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required');

export function hotelBrandRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  router.get('/', getHotelBrandController);
  router.patch(
    '/',
    createAuthMiddleware(cookieName),
    requireRoles('admin'),
    validateBody(hotelBrandSchema),
    updateHotelBrandController,
  );
  return router;
}
