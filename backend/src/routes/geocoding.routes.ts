import { Router } from 'express';
import { geocodeController } from '../controllers/geocoding.controller.js';

export function geocodingRoutes(): Router {
  const router = Router();
  router.post('/', geocodeController);
  return router;
}
