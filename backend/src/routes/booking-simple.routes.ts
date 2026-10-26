import { Router } from 'express';
import {
  listBookingsController,
  createBookingController,
  deleteBookingController,
} from '../controllers/booking-simple.controller.js';

export function bookingSimpleRoutes(): Router {
  const router = Router();
  router.get('/', listBookingsController);
  router.post('/', createBookingController);
  router.delete('/:id', deleteBookingController);
  return router;
}
