import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { validateParams, validateQuery } from '../middleware/validationMiddleware.js';
import {
  checkAvailabilityController,
  getRoomById,
  getRooms,
} from '../controllers/room.controller.js';

const id = z.string().regex(/^\d+$/);
const availabilitySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
}).strict();
const roomsQuerySchema = z.object({ branchId: id.optional() }).strict();

export function roomRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();

  // Public routes
  router.get('/rooms', validateQuery(roomsQuerySchema), getRooms);
  router.get('/branches/:branchId/rooms', validateParams(z.object({ branchId: id })), getRooms);
  router.get('/rooms/:roomId/availability', validateQuery(availabilitySchema), checkAvailabilityController);
  router.get('/rooms/:roomId', validateParams(z.object({ roomId: id })), getRoomById);

  return router;
}
