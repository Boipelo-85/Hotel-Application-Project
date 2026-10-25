import { inTransaction } from '../config/database.js';
import { getPaymentProvider, type VerifiedPaymentEvent } from '../config/payment.js';
import { AppError } from '../utils/errors.js';
import {
  findPaymentById,
  findBookingForCheckout,
  findActivePaymentForBooking,
  insertPayment,
  saveCheckoutReference,
  findPaymentEvent,
  findPaymentByProviderReference,
  findBookingPaymentState,
  findPaymentForUpdate,
  insertPaymentEvent,
  savePaymentStatus,
  saveBookingStatus,
  insertPaymentNotification,
  findBookingByIdForUpdate,
  findLatestBookingPayment,
  saveRefundIdempotencyKey,
} from '../repositories/payment.repository.js';

interface PaymentRow {
  id: string;
  booking_id: string;
  provider: string;
  provider_transaction_reference: string | null;
  checkout_url: string | null;
  refund_idempotency_key: string | null;
  amount: string;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  idempotency_key: string;
}

interface PendingCheckout {
  payment: PaymentRow;
  bookingReference: string;
  existing: boolean;
}

function toMinorUnits(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new AppError(400, 'Invalid payment amount', 'INVALID_AMOUNT');
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
}

async function getOrCreatePendingCheckout(
  userId: string,
  bookingId: string,
  idempotencyKey: string,
  providerName: string,
): Promise<PendingCheckout> {
  return inTransaction(async (client) => {
    const bookingResult = await findBookingForCheckout(client, bookingId);
    const booking = bookingResult.rows[0];
    if (!booking || booking.user_id !== userId) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }
    if (booking.status !== 'pending' || !booking.expires_at || booking.expires_at <= new Date()) {
      throw new AppError(409, 'This booking is no longer awaiting payment', 'BOOKING_EXPIRED');
    }

    const existingPayment = await findActivePaymentForBooking(client, bookingId);
    if (existingPayment.rows[0]) {
      if (existingPayment.rows[0].provider !== providerName) {
        throw new AppError(409, 'A payment is already in progress with a different provider', 'PAYMENT_PROVIDER_CONFLICT');
      }
      return { payment: existingPayment.rows[0], bookingReference: booking.booking_reference, existing: true };
    }

    const paymentResult = await insertPayment(
      client, bookingId, providerName, booking.total_amount, booking.currency, idempotencyKey,
    );
    const payment = paymentResult.rows[0];
    if (payment.booking_id !== bookingId) {
      throw new AppError(409, 'Idempotency key was already used for another payment', 'IDEMPOTENCY_CONFLICT');
    }
    return { payment, bookingReference: booking.booking_reference, existing: false };
  });
}

export async function createCheckout(
  userId: string,
  bookingId: string,
  idempotencyKeyInput: string,
): Promise<{ payment: PaymentRow; checkoutUrl: string }> {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new AppError(503, 'Payment provider is not configured; no payment was created', 'PAYMENTS_UNAVAILABLE');
  }
  const idempotencyKey = `${userId}:${idempotencyKeyInput}`;
  const { payment, bookingReference } = await getOrCreatePendingCheckout(
    userId,
    bookingId,
    idempotencyKey,
    provider.name,
  );
  if (payment.status === 'successful') {
    throw new AppError(409, 'This booking has already been paid', 'ALREADY_PAID');
  }
  if (payment.status !== 'pending') {
    throw new AppError(409, 'This payment attempt has failed; retry with a new idempotency key', 'PAYMENT_FAILED');
  }
  if (payment.checkout_url && payment.provider_transaction_reference) {
    return { payment, checkoutUrl: payment.checkout_url };
  }

  const checkout = await provider.createCheckout({
    idempotencyKey: payment.idempotency_key,
    bookingReference,
    amount: payment.amount,
    currency: payment.currency,
  });
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(checkout.checkoutUrl);
  } catch {
    throw new AppError(502, 'Payment provider returned an invalid checkout URL', 'INVALID_PROVIDER_RESPONSE');
  }
  if (checkoutUrl.protocol !== 'https:') {
    throw new AppError(502, 'Payment provider returned a non-secure checkout URL', 'INVALID_PROVIDER_RESPONSE');
  }
  const updated = await saveCheckoutReference(
    payment.id,
    checkout.transactionReference,
    checkoutUrl.toString(),
  );
  if (!updated.rows[0]) throw new AppError(409, 'Payment state changed while checkout was created', 'PAYMENT_STATE_CHANGED');
  return { payment: updated.rows[0], checkoutUrl: checkoutUrl.toString() };
}

export async function getPayment(paymentId: string, userId: string): Promise<{
  id: string;
  booking_id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: Date;
}> {
  const result = await findPaymentById(paymentId);
  const payment = result.rows[0];
  if (!payment || payment.user_id !== userId) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
  const { user_id: _userId, ...publicPayment } = payment;
  return publicPayment;
}

function assertValidProviderEvent(event: VerifiedPaymentEvent): void {
  if (
    !event.eventId ||
    event.eventId.length > 255 ||
    !event.transactionReference ||
    event.transactionReference.length > 255 ||
    !/^[A-Za-z]{3}$/.test(event.currency) ||
    !['successful', 'failed', 'refunded'].includes(event.status)
  ) {
    throw new AppError(400, 'Payment provider event is invalid', 'INVALID_PAYMENT_EVENT');
  }
  toMinorUnits(event.amount);
}

export async function processVerifiedPaymentEvent(
  providerName: string,
  event: VerifiedPaymentEvent,
): Promise<void> {
  assertValidProviderEvent(event);
  await inTransaction(async (client) => {
    const duplicate = await findPaymentEvent(client, providerName, event.eventId);
    if (duplicate.rowCount) return;

    const referenceResult = await findPaymentByProviderReference(client, providerName, event.transactionReference);
    const reference = referenceResult.rows[0];
    if (!reference) throw new AppError(404, 'Payment reference not found', 'PAYMENT_NOT_FOUND');
    const bookingResult = await findBookingPaymentState(client, reference.booking_id);
    const booking = bookingResult.rows[0];
    const paymentResult = await findPaymentForUpdate(client, reference.id);
    const payment = paymentResult.rows[0];
    if (!payment || !booking) throw new AppError(404, 'Payment reference not found', 'PAYMENT_NOT_FOUND');
    if (
      toMinorUnits(payment.amount) !== toMinorUnits(event.amount) ||
      payment.currency.toUpperCase() !== event.currency.toUpperCase()
    ) {
      throw new AppError(400, 'Payment event amount or currency does not match', 'PAYMENT_MISMATCH');
    }

    const eventResult = await insertPaymentEvent(client, providerName, event.eventId, payment.id, event.status);
    if (!eventResult.rowCount || payment.status === 'refunded') return;

    if (event.status === 'successful') {
      if (payment.status === 'successful') return;
      await savePaymentStatus(client, payment.id, 'successful');
      const bookingCanBeConfirmed =
        booking.status === 'pending' &&
        booking.expires_at !== null &&
        booking.expires_at > new Date();
      if (bookingCanBeConfirmed) {
        await saveBookingStatus(client, payment.booking_id, 'confirmed');
        await insertPaymentNotification(client, booking.user_id, 'booking_confirmed',
          'Payment was verified and your reservation is confirmed.',
          { bookingId: payment.booking_id });
      } else {
        if (booking.status === 'pending') {
          await saveBookingStatus(client, payment.booking_id, 'cancelled');
        }
        await insertPaymentNotification(client, booking.user_id, 'payment_review_required',
          'Payment was received after the reservation expired or was cancelled. Contact support about a refund.',
          { bookingId: payment.booking_id, paymentId: payment.id });
      }
      return;
    }
    if (event.status === 'failed' && payment.status === 'pending') {
      await savePaymentStatus(client, payment.id, 'failed');
      await insertPaymentNotification(client, booking.user_id, 'payment_failed',
        'Payment could not be completed.', { bookingId: payment.booking_id });
    } else if (event.status === 'refunded') {
      await savePaymentStatus(client, payment.id, 'refunded');
      await saveBookingStatus(client, payment.booking_id, 'cancelled');
      await insertPaymentNotification(client, booking.user_id, 'payment_refunded',
        'Your payment was refunded.', { bookingId: payment.booking_id });
    }
  });
}

export async function handleProviderWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): Promise<void> {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new AppError(503, 'Payment provider is not configured', 'PAYMENTS_UNAVAILABLE');
  }
  const event = await provider.verifyWebhook(rawBody, signature);
  await processVerifiedPaymentEvent(provider.name, event);
}

export async function requestBookingRefund(
  bookingId: string,
  idempotencyKeyInput: string,
): Promise<{ status: 'refund_requested' | 'refunded'; paymentId: string }> {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new AppError(503, 'Payment provider is not configured; no refund was requested', 'PAYMENTS_UNAVAILABLE');
  }
  const key = `refund:${bookingId}:${idempotencyKeyInput}`;
  const payment = await inTransaction(async (client) => {
    const booking = await findBookingByIdForUpdate(client, bookingId);
    if (!booking.rowCount) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    const result = await findLatestBookingPayment(client, bookingId);
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    if (row.status === 'refunded') return row;
    if (row.status !== 'successful' || !row.provider_transaction_reference) {
      throw new AppError(409, 'Only a successfully paid booking can be refunded', 'INVALID_PAYMENT_STATE');
    }
    if (row.refund_idempotency_key && row.refund_idempotency_key !== key) {
      throw new AppError(409, 'A refund is already in progress for this payment', 'REFUND_IN_PROGRESS');
    }
    const updated = await saveRefundIdempotencyKey(client, row.id, key);
    return updated.rows[0];
  });
  if (payment.status === 'refunded') {
    return { status: 'refunded', paymentId: payment.id };
  }
  await provider.requestRefund({
    idempotencyKey: payment.refund_idempotency_key!,
    transactionReference: payment.provider_transaction_reference!,
    amount: payment.amount,
    currency: payment.currency,
  });
  return { status: 'refund_requested', paymentId: payment.id };
}
