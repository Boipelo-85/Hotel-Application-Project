import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateParams } from '../middleware/validationMiddleware.js';
import {
  getNotifications,
  markAsRead,
} from '../controllers/notification.controller.js';

export function notificationRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.use(auth);
  router.get('/', getNotifications);
  router.patch(
    '/:notificationId/read',
    validateParams(z.object({ notificationId: z.string().regex(/^\d+$/) })),
    markAsRead,
  );
  return router;
}
