import type { RequestHandler } from 'express';
import {
  createPayment,
  findPaymentsByBookingId,
  updatePaymentStatus,
} from '../repositories/payment-simple.repository.js';
import type { PaymentInput } from '../types/models.js';

export const createPaymentController: RequestHandler = async (request, response) => {
  const payment = await createPayment(request.body as PaymentInput);
  response.status(201).json({ payment });
};

export const getPaymentsByBookingController: RequestHandler = async (request, response) => {
  const booking_id = parseInt(request.params.bookingId);
  if (isNaN(booking_id)) {
    return response.status(400).json({ error: 'Invalid booking ID' });
  }

  const payments = await findPaymentsByBookingId(booking_id);
  response.json({ payments });
};
