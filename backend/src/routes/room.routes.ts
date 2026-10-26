import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireRoles } from '../middleware/adminMiddleware.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import {
  checkAvailabilityController,
  createRoom,
  deleteRoomController,
  getRoomById,
  getRooms,
  updateRoom,
} from '../controllers/room.controller.js';

const id = z.string().regex(/^\d+$/);
const createRoomSchema = z.object({
  roomType: z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  capacity: z.number().int().min(1).max(100),
  quantity: z.number().int().min(1).max(1000).optional(),
  price: z.number().nonnegative().max(1_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
}).strict();
const createRoomAtRootSchema = createRoomSchema.extend({ branchId: id });
const updateRoomSchema = z.object({
  roomType: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(5000).nullable().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  quantity: z.number().int().min(1).max(1000).optional(),
  price: z.number().nonnegative().max(1_000_000).optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required');
const availabilitySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
}).strict();
const roomsQuerySchema = z.object({ branchId: id.optional() }).strict();

export function roomRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);

  router.get('/rooms', validateQuery(roomsQuerySchema), getRooms);
  router.get('/branches/:branchId/rooms', validateParams(z.object({ branchId: id })), getRooms);
  router.post(
    '/rooms',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateBody(createRoomAtRootSchema),
    createRoom,
  );
  router.post(
    '/branches/:branchId/rooms',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ branchId: id })),
    validateBody(createRoomSchema),
    createRoom,
  );
  router.get(
    '/rooms/:roomId/availability',
    validateQuery(availabilitySchema),
    checkAvailabilityController,
  );
  router.get('/rooms/:roomId', validateParams(z.object({ roomId: id })), getRoomById);
  router.patch(
    '/rooms/:roomId',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ roomId: id })),
    validateBody(updateRoomSchema),
    updateRoom,
  );
  router.delete(
    '/rooms/:roomId',
    auth,
    requireRoles('admin', 'branch_manager'),
    validateParams(z.object({ roomId: id })),
    deleteRoomController,
  );
  return router;
}
