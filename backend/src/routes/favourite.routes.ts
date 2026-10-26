import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from '../controllers/favourite.controller.js';

const branchIdParams = z.object({ branchId: z.string().regex(/^\d+$/) });
const createFavouriteSchema = z.object({ branchId: z.string().regex(/^\d+$/) }).strict();

export function favouriteRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.use(auth);
  router.get('/', getFavourites);
  router.post('/', validateBody(createFavouriteSchema), addFavourite);
  router.delete('/:branchId', validateParams(branchIdParams), removeFavourite);
  return router;
}
