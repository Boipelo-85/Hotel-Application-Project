import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAdmin, requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import { listBranchBookingsController } from '../controllers/booking.controller.js';
import { listHotelReviewsController } from '../controllers/review.controller.js';
import {
  assignBranchManagerController,
  addBranchImageController,
  createAmenityController,
  createBranch,
  deleteBranchController,
  deleteBranchImageController,
  getBranchById,
  listAmenitiesController,
  getBranches,
  listManagedBranchesController,
  setBranchAmenitiesController,
  updateBranch,
  updateBranchStatusController,
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

const createBranchSchema = z.object({
  managerUserId: id.nullable().optional(),
  name: branchFields.name,
  city: branchFields.city,
  province: branchFields.province,
  address: branchFields.address,
  description: branchFields.description.optional(),
  policies: branchFields.policies.optional(),
  starRating: branchFields.starRating.optional(),
  pricePerNight: branchFields.pricePerNight,
  currency: branchFields.currency.optional(),
  contactEmail: branchFields.contactEmail.optional(),
  contactPhone: branchFields.contactPhone.optional(),
  latitude: branchFields.latitude.optional(),
  longitude: branchFields.longitude.optional(),
}).strict();

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

const statusSchema = z.object({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected']),
}).strict();

const imageSchema = z.object({
  imageUrl: z.string().url().max(2048).refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
  altText: z.string().max(300).optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
}).strict();

const amenitySchema = z.object({ name: z.string().trim().min(1).max(100), category: z.string().max(80).optional() }).strict();
const amenitiesSchema = z.object({ amenityIds: z.array(id).max(100) }).strict();
const branchSearchSchema = z.object({
  search: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
}).strict();
export function branchRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);

  router.get('/', validateQuery(branchSearchSchema), getBranches);
  router.get('/amenities', listAmenitiesController);
  router.post('/amenities', auth, requireAdmin, validateBody(amenitySchema), createAmenityController);
  router.get('/managed', auth, requireRoles('admin', 'branch_manager'), listManagedBranchesController);
  router.get(
    '/:branchId/bookings',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    listBranchBookingsController,
  );
  router.get(
    '/:branchId/reviews',
    validateParams(z.object({ branchId: id })),
    listHotelReviewsController,
  );
  router.post('/', auth, requireAdmin, validateBody(createBranchSchema), createBranch);
  router.patch(
    '/:branchId/manager',
    auth,
    validateParams(z.object({ branchId: id })),
    requireAdmin,
    validateBody(z.object({ managerUserId: id.nullable() }).strict()),
    assignBranchManagerController,
  );
  router.patch(
    '/:branchId/publication',
    auth,
    validateParams(z.object({ branchId: id })),
    requireAdmin,
    validateBody(statusSchema),
    updateBranchStatusController,
  );
  router.delete(
    '/:branchId',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    deleteBranchController,
  );
  router.post(
    '/:branchId/images',
    auth,
    validateParams(z.object({ branchId: id })),
    requireRoles('admin', 'branch_manager'),
    validateBody(imageSchema),
    addBranchImageController,
  );
  router.delete(
    '/:branchId/images/:imageId',
    auth,
    validateParams(z.object({ branchId: id, imageId: id })),
    requireRoles('admin', 'branch_manager'),
    deleteBranchImageController,
  );
  router.put(
    '/:branchId/amenities',
    auth,
    validateParams(z.object({ branchId: id })),
    requireRoles('admin', 'branch_manager'),
    validateBody(amenitiesSchema),
    setBranchAmenitiesController,
  );
  router.patch(
    '/:branchId',
    auth,
    validateParams(z.object({ branchId: id })),
    requireRoles('admin', 'branch_manager'),
    validateBody(updateBranchSchema),
    updateBranch,
  );
  router.get('/:branchId', validateParams(z.object({ branchId: id })), getBranchById);
  return router;
}
