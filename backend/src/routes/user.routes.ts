import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { deleteProfile, getProfile, updateProfile, updateUserRoleController } from '../controllers/user.controller.js';

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required');
const roleSchema = z.object({ role: z.enum(['customer', 'hotel_partner']) }).strict();

export function userRoutes(config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.use(auth);
  router.get('/profile', getProfile);
  router.patch('/profile', validateBody(profileSchema), updateProfile);
  router.delete('/profile', deleteProfile(cookieName, config.NODE_ENV === 'production'));
  router.patch(
    '/:userId/role',
    requireAdmin,
    validateBody(roleSchema),
    updateUserRoleController,
  );
  return router;
}
