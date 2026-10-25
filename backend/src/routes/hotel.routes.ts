import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAdmin, requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import {
  addHotelImageController,
  createAmenityController,
  createHotel,
  deleteHotelController,
  deleteHotelImageController,
  getHotelById,
  listAmenitiesController,
  getHotels,
  listManagedHotelsController,
  setHotelAmenitiesController,
  updateHotel,
  updateHotelStatusController,
} from '../controllers/hotel.controller.js';

const id = z.string().regex(/^\d+$/);
const hotelFields = {
  name: z.string().trim().min(1).max(200),
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

const createHotelSchema = z.object({
  name: hotelFields.name,
  address: hotelFields.address,
  description: hotelFields.description.optional(),
  policies: hotelFields.policies.optional(),
  starRating: hotelFields.starRating.optional(),
  pricePerNight: hotelFields.pricePerNight,
  currency: hotelFields.currency.optional(),
  contactEmail: hotelFields.contactEmail.optional(),
  contactPhone: hotelFields.contactPhone.optional(),
  latitude: hotelFields.latitude.optional(),
  longitude: hotelFields.longitude.optional(),
}).strict();

const updateHotelSchema = z.object({
  name: hotelFields.name.optional(),
  address: hotelFields.address.optional(),
  description: hotelFields.description.optional(),
  policies: hotelFields.policies.optional(),
  starRating: hotelFields.starRating.optional(),
  pricePerNight: hotelFields.pricePerNight.optional(),
  currency: hotelFields.currency.optional(),
  contactEmail: hotelFields.contactEmail.optional(),
  contactPhone: hotelFields.contactPhone.optional(),
  latitude: hotelFields.latitude.optional(),
  longitude: hotelFields.longitude.optional(),
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
const hotelSearchSchema = z.object({ search: z.string().trim().max(200).optional() }).strict();

export function hotelRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);

  router.get('/', validateQuery(hotelSearchSchema), getHotels);
  router.get('/amenities', listAmenitiesController);
  router.post('/amenities', auth, requireAdmin, validateBody(amenitySchema), createAmenityController);
  router.get('/managed', auth, requireRoles('admin', 'hotel_partner'), listManagedHotelsController);
  router.post('/', auth, requireRoles('admin', 'hotel_partner'), validateBody(createHotelSchema), createHotel);
  router.patch(
    '/:hotelId/publication',
    auth,
    validateParams(z.object({ hotelId: id })),
    requireAdmin,
    validateBody(statusSchema),
    updateHotelStatusController,
  );
  router.delete(
    '/:hotelId',
    auth,
    requireRoles('admin', 'hotel_partner'),
    validateParams(z.object({ hotelId: id })),
    deleteHotelController,
  );
  router.post(
    '/:hotelId/images',
    auth,
    requireRoles('admin', 'hotel_partner'),
    validateBody(imageSchema),
    addHotelImageController,
  );
  router.delete('/:hotelId/images/:imageId', auth, requireRoles('admin', 'hotel_partner'), deleteHotelImageController);
  router.put(
    '/:hotelId/amenities',
    auth,
    requireRoles('admin', 'hotel_partner'),
    validateBody(amenitiesSchema),
    setHotelAmenitiesController,
  );
  router.patch(
    '/:hotelId',
    auth,
    validateParams(z.object({ hotelId: id })),
    requireRoles('admin', 'hotel_partner'),
    validateBody(updateHotelSchema),
    updateHotel,
  );
  router.get('/:hotelId', validateParams(z.object({ hotelId: id })), getHotelById);
  return router;
}
