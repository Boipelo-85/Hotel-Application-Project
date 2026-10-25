import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validationMiddleware.js';
import {
  createReview,
  deleteReview,
  getHotelReviews,
  updateReview,
} from '../controllers/review.controller.js';

const reviewBody = {
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).nullable().optional(),
};
const createReviewSchema = z.object({
  hotelId: z.string().regex(/^\d+$/),
  bookingId: z.string().regex(/^\d+$/),
  ...reviewBody,
}).strict();
const updateReviewSchema = z.object(reviewBody).strict().refine((body) => Object.keys(body).length > 0);

export function reviewRoutes(_config: AppConfig, cookieName: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(cookieName);
  router.get('/hotels/:hotelId', validateParams(z.object({ hotelId: z.string().regex(/^\d+$/) })), getHotelReviews);
  router.get('/hotel/:hotelId', validateParams(z.object({ hotelId: z.string().regex(/^\d+$/) })), getHotelReviews);
  router.use(auth);
  router.post('/', validateBody(createReviewSchema), createReview);
  router.patch(
    '/:reviewId',
    validateParams(z.object({ reviewId: z.string().regex(/^\d+$/) })),
    validateBody(updateReviewSchema),
    updateReview,
  );
  router.delete(
    '/:reviewId',
    validateParams(z.object({ reviewId: z.string().regex(/^\d+$/) })),
    deleteReview,
  );
  return router;
}
