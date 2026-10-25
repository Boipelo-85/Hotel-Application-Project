import type { RequestHandler } from 'express';
import { AppError, getRouteParam } from '../utils/errors.js';
import {
  createReview as createReviewService,
  deleteReview as deleteReviewService,
  getHotelReviews as getHotelReviewsService,
  updateReview as updateReviewService,
} from '../services/review.service.js';

export const listHotelReviewsController: RequestHandler = async (request, response) => {
  response.json({ reviews: await getHotelReviewsService(getRouteParam(request, 'hotelId')) });
};

export const createReviewController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.status(201).json({ review: await createReviewService(request.auth.userId, request.body) });
};

export const updateReviewController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({
    review: await updateReviewService(getRouteParam(request, 'reviewId'), request.auth.userId, request.body),
  });
};

export const deleteReviewController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  await deleteReviewService(getRouteParam(request, 'reviewId'), request.auth.userId);
  response.status(204).end();
};

export const createReview = createReviewController;
export const getHotelReviews = listHotelReviewsController;
export const updateReview = updateReviewController;
export const deleteReview = deleteReviewController;
