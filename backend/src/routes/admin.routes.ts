import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAdmin, requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import {
  getDashboardStatsController,
  getRecentBookingsController,
  getBranchStatsController,
  getUserStatsController,
  getAllUsersController,
  updateUserController,
  getAvailabilityReportController,
  getRevenueReportController,
} from '../controllers/admin.controller.js';
import {
  assignBranchManagerController,
  addBranchImageController,
  createAmenityController,
  createBranch,
  deleteBranchController,
  deleteBranchImageController,
  setBranchAmenitiesController,
  updateBranchStatusController,
} from '../controllers/branch.controller.js';
import { updateUserRoleController } from '../controllers/user.controller.js';
import { updateBookingStatusController } from '../controllers/booking.controller.js';
import {
  createRoom,
  deleteRoomController,
  updateRoom,
} from '../controllers/room.controller.js';
import { updateHotelBrandController } from '../controllers/hotel-brand.controller.js';
import { refundBookingController } from '../controllers/payment.controller.js';

const id = z.string().regex(/^\d+$/);

// Admin Dashboard Routes
export function adminRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);

  // All admin routes require authentication
  router.use(auth);

  // Dashboard Stats
  router.get('/dashboard/stats', getDashboardStatsController);
  router.get('/dashboard/recent-bookings', validateQuery(z.object({ limit: z.string().optional() })), getRecentBookingsController);

  // Reports
  router.get('/reports/branches', getBranchStatsController);
  router.get('/reports/users', getUserStatsController);
  router.get('/reports/availability', getAvailabilityReportController);
  router.get('/reports/revenue', validateQuery(z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })), getRevenueReportController);

  // User Management
  router.get('/users', validateQuery(z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  })), getAllUsersController);
  router.patch(
    '/users/:userId',
    validateParams(z.object({ userId: id })),
    validateBody(z.object({
      role: z.enum(['customer', 'branch_manager', 'admin']).optional(),
      is_active: z.boolean().optional(),
    }).strict()),
    updateUserController,
  );
  router.patch(
    '/users/:userId/role',
    requireAdmin,
    validateParams(z.object({ userId: id })),
    validateBody(z.object({ role: z.enum(['customer', 'branch_manager']) }).strict()),
    updateUserRoleController,
  );

  // Branch Management
  router.post(
    '/branches',
    requireAdmin,
    validateBody(z.object({
      managerUserId: id.nullable().optional(),
      name: z.string().trim().min(1).max(200),
      city: z.string().trim().min(1).max(120),
      province: z.string().trim().min(1).max(120),
      address: z.string().trim().min(1).max(500),
      description: z.string().max(10_000).nullable().optional(),
      policies: z.record(z.string(), z.string().max(1000)).optional(),
      starRating: z.number().min(1).max(5).nullable().optional(),
      pricePerNight: z.number().nonnegative().max(1_000_000),
      currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
      contactEmail: z.string().email().nullable().optional(),
      contactPhone: z.string().max(50).nullable().optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
    }).strict()),
    createBranch,
  );
  router.patch(
    '/branches/:branchId/manager',
    requireAdmin,
    validateParams(z.object({ branchId: id })),
    validateBody(z.object({ managerUserId: id.nullable() }).strict()),
    assignBranchManagerController,
  );
  router.patch(
    '/branches/:branchId/publication',
    requireAdmin,
    validateParams(z.object({ branchId: id })),
    validateBody(z.object({ status: z.enum(['draft', 'pending_review', 'published', 'rejected']) }).strict()),
    updateBranchStatusController,
  );
  router.delete(
    '/branches/:branchId',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    deleteBranchController,
  );
  router.post(
    '/branches/:branchId/images',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    validateBody(z.object({
      imageUrl: z.string().url().max(2048).refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
      altText: z.string().max(300).optional(),
      displayOrder: z.number().int().min(0).max(1000).optional(),
    }).strict()),
    addBranchImageController,
  );
  router.delete(
    '/branches/:branchId/images/:imageId',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id, imageId: id })),
    deleteBranchImageController,
  );
  router.put(
    '/branches/:branchId/amenities',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    validateBody(z.object({ amenityIds: z.array(id).max(100) }).strict()),
    setBranchAmenitiesController,
  );

  // Amenity Management
  router.post(
    '/amenities',
    requireAdmin,
    validateBody(z.object({ name: z.string().trim().min(1).max(100), category: z.string().max(80).optional() }).strict()),
    createAmenityController,
  );

  // Booking Management
  router.patch(
    '/bookings/:bookingId/status',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ bookingId: id })),
    validateBody(z.object({ status: z.enum(['confirmed', 'cancelled', 'completed']) }).strict()),
    updateBookingStatusController,
  );

  // Room Management
  router.post(
    '/rooms',
    requireRoles('admin', 'branch_manager'),
    validateBody(z.object({
      branchId: id,
      roomType: z.string().trim().min(1).max(120),
      description: z.string().max(5000).nullable().optional(),
      capacity: z.number().int().min(1).max(100),
      quantity: z.number().int().min(1).max(1000).optional(),
      price: z.number().nonnegative().max(1_000_000),
      currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
    }).strict()),
    createRoom,
  );
  router.post(
    '/branches/:branchId/rooms',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    validateBody(z.object({
      roomType: z.string().trim().min(1).max(120),
      description: z.string().max(5000).nullable().optional(),
      capacity: z.number().int().min(1).max(100),
      quantity: z.number().int().min(1).max(1000).optional(),
      price: z.number().nonnegative().max(1_000_000),
      currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
    }).strict()),
    createRoom,
  );
  router.patch(
    '/rooms/:roomId',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ roomId: id })),
    validateBody(z.object({
      roomType: z.string().trim().min(1).max(120).optional(),
      description: z.string().max(5000).nullable().optional(),
      capacity: z.number().int().min(1).max(100).optional(),
      quantity: z.number().int().min(1).max(1000).optional(),
      price: z.number().nonnegative().max(1_000_000).optional(),
      currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required')),
    updateRoom,
  );
  router.delete(
    '/rooms/:roomId',
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ roomId: id })),
    deleteRoomController,
  );

  // Hotel Brand Management
  router.patch(
    '/brand',
    requireAdmin,
    validateBody(z.object({
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(10_000).nullable().optional(),
      logoUrl: z.string().url().max(2048).nullable().optional(),
      starRating: z.number().min(1).max(5).nullable().optional(),
      contactEmail: z.string().email().nullable().optional(),
      contactPhone: z.string().max(50).nullable().optional(),
    }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required')),
    updateHotelBrandController,
  );

  // Payment Management
  router.post(
    '/payments/bookings/:bookingId/refund',
    requireAdmin,
    validateParams(z.object({ bookingId: z.string().regex(/^\d+$/) })),
    refundBookingController,
  );

  return router;
}
