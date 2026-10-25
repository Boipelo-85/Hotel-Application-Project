import type { RequestHandler } from 'express';
import { getPaymentProvider } from '../config/payment.js';
import {
  handleProviderWebhook as handleProviderWebhookService,
  createCheckout,
  getPayment as getPaymentService,
  requestBookingRefund,
} from '../services/payment.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

export const createCheckoutController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  const idempotencyKey = request.get('idempotency-key');
  if (!idempotencyKey) {
    throw new AppError(400, 'Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED');
  }
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey)) {
    throw new AppError(400, 'Idempotency-Key must be 8-120 safe characters', 'INVALID_IDEMPOTENCY_KEY');
  }
  const bookingId = request.params.bookingId ?? request.body.bookingId;
  if (typeof bookingId !== 'string' || !/^\d+$/.test(bookingId)) {
    throw new AppError(400, 'A valid bookingId is required', 'INVALID_DATA');
  }
  const result = await createCheckout(request.auth.userId, bookingId, idempotencyKey);
  response.status(200).json({
    payment: {
      id: result.payment.id,
      bookingId: result.payment.booking_id,
      amount: result.payment.amount,
      currency: result.payment.currency,
      status: result.payment.status,
    },
    checkoutUrl: result.checkoutUrl,
  });
};

export const getPaymentController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({ payment: await getPaymentService(getRouteParam(request, 'paymentId'), request.auth.userId) });
};

export const refundBookingController: RequestHandler = async (request, response) => {
  const idempotencyKey = request.get('idempotency-key');
  if (!idempotencyKey || !/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey)) {
    throw new AppError(400, 'A valid Idempotency-Key header is required', 'INVALID_IDEMPOTENCY_KEY');
  }
  const result = await requestBookingRefund(getRouteParam(request, 'bookingId'), idempotencyKey);
  response.status(result.status === 'refunded' ? 200 : 202).json(result);
};

export const paymentWebhookController: RequestHandler = async (request, response) => {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new AppError(503, 'Payment provider is not configured', 'PAYMENTS_UNAVAILABLE');
  }
  if (!Buffer.isBuffer(request.body)) {
    throw new AppError(400, 'Webhook must contain the raw request body', 'INVALID_WEBHOOK_BODY');
  }
  await handleProviderWebhookService(request.body, request.get('payment-signature'));
  response.status(200).json({ received: true });
};

export const initiatePayment = createCheckoutController;
export const handleWebhook = paymentWebhookController;
export const getPayment = getPaymentController;
