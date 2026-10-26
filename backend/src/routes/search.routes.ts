import { Router } from 'express';
import { z } from 'zod';
import { searchBranchesController } from '../controllers/branch.controller.js';
import { validateQuery } from '../middleware/validationMiddleware.js';

const availabilitySearchSchema = z.object({
  destination: z.string().trim().min(1).max(120),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.coerce.number().int().min(1).max(100),
  guests: z.coerce.number().int().min(1).max(1000),
}).strict();

export function searchRoutes(): Router {
  const router = Router();
  router.get('/search', validateQuery(availabilitySearchSchema), searchBranchesController);
  return router;
}
