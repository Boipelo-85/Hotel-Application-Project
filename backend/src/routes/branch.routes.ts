import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import { listBranchBookingsController } from '../controllers/booking.controller.js';
import { listHotelReviewsController } from '../controllers/review.controller.js';
import {
  getBranchById,
  listAmenitiesController,
  getBranches,
  listManagedBranchesController,
  updateBranch,
} from '../controllers/branch.controller.js';

const id = z.string().regex(/^\d+$/);
const branchFields = {
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  description: z.string().max(10_000).nullable(),
  policies: z.record(z.string(), z.string().max(1000)),
  starRating: z.number().min(1).max(5).nullable(),
  pricePerNight: z.number().nonnegative().max(1_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().max(50).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
};

const updateBranchSchema = z.object({
  name: branchFields.name.optional(),
  city: branchFields.city.optional(),
  province: branchFields.province.optional(),
  address: branchFields.address.optional(),
  description: branchFields.description.optional(),
  policies: branchFields.policies.optional(),
  starRating: branchFields.starRating.optional(),
  pricePerNight: branchFields.pricePerNight.optional(),
  currency: branchFields.currency.optional(),
  contactEmail: branchFields.contactEmail.optional(),
  contactPhone: branchFields.contactPhone.optional(),
  latitude: branchFields.latitude.optional(),
  longitude: branchFields.longitude.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required');

const branchSearchSchema = z.object({
  search: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
}).strict();
export function branchRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);

  // Public routes
  router.get('/', validateQuery(branchSearchSchema), getBranches);
  router.get('/amenities', listAmenitiesController);
  router.get('/managed', auth, requireRoles('admin', 'branch_manager'), listManagedBranchesController);
  router.get('/:branchId/reviews', validateParams(z.object({ branchId: id })), listHotelReviewsController);
  router.get('/:branchId', validateParams(z.object({ branchId: id })), getBranchById);

  // Authenticated routes
  router.get(
    '/:branchId/bookings',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    listBranchBookingsController,
  );
  router.patch(
    '/:branchId',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    validateBody(updateBranchSchema),
    updateBranch,
  );

  return router;
}
