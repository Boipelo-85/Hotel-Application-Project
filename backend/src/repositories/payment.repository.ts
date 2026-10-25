import { query } from '../config/database.js';
import type { PoolClient } from 'pg';

export interface PaymentRecord {
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

export async function findPaymentById(paymentId: string) {
  return query<{
    id: string;
    booking_id: string;
    user_id: string;
    amount: string;
    currency: string;
    status: string;
    created_at: Date;
  }>(
    `SELECT p.id, p.booking_id, b.user_id, p.amount, p.currency, p.status, p.created_at
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     WHERE p.id = $1`,
    [paymentId],
  );
}

export async function findBookingForCheckout(client: PoolClient, bookingId: string) {
  return client.query<{
    id: string;
    booking_reference: string;
    user_id: string;
    total_amount: string;
    currency: string;
    status: string;
    expires_at: Date | null;
  }>(
    `SELECT id, booking_reference, user_id, total_amount, currency, status, expires_at
     FROM bookings WHERE id = $1 FOR UPDATE`,
    [bookingId],
  );
}

export async function findActivePaymentForBooking(client: PoolClient, bookingId: string) {
  return client.query<PaymentRecord>(
    `SELECT * FROM payments WHERE booking_id = $1 AND status IN ('pending', 'successful')
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
    [bookingId],
  );
}

export async function insertPayment(
  client: PoolClient,
  bookingId: string,
  provider: string,
  amount: string,
  currency: string,
  idempotencyKey: string,
) {
  return client.query<PaymentRecord>(
    `INSERT INTO payments (booking_id, provider, amount, currency, status, idempotency_key)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
     RETURNING *`,
    [bookingId, provider, amount, currency, idempotencyKey],
  );
}

export async function saveCheckoutReference(
  paymentId: string,
  transactionReference: string,
  checkoutUrl: string,
) {
  return query<PaymentRecord>(
    `UPDATE payments SET provider_transaction_reference = $2, checkout_url = $3,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [paymentId, transactionReference, checkoutUrl],
  );
}

export async function findPaymentEvent(client: PoolClient, provider: string, eventId: string) {
  return client.query(
    'SELECT 1 FROM payment_events WHERE provider = $1 AND provider_event_id = $2',
    [provider, eventId],
  );
}

export async function findPaymentByProviderReference(
  client: PoolClient,
  provider: string,
  transactionReference: string,
) {
  return client.query<{ id: string; booking_id: string }>(
    `SELECT id, booking_id FROM payments
     WHERE provider = $1 AND provider_transaction_reference = $2`,
    [provider, transactionReference],
  );
}

export async function findBookingPaymentState(client: PoolClient, bookingId: string) {
  return client.query<{ status: string; expires_at: Date | null; user_id: string }>(
    'SELECT status, expires_at, user_id FROM bookings WHERE id = $1 FOR UPDATE',
    [bookingId],
  );
}

export async function findPaymentForUpdate(client: PoolClient, paymentId: string) {
  return client.query<PaymentRecord>('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
}

export async function insertPaymentEvent(
  client: PoolClient,
  provider: string,
  eventId: string,
  paymentId: string,
  status: string,
) {
  return client.query(
    `INSERT INTO payment_events (provider, provider_event_id, payment_id, event_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_event_id) DO NOTHING
     RETURNING id`,
    [provider, eventId, paymentId, status],
  );
}

export async function savePaymentStatus(client: PoolClient, paymentId: string, status: PaymentRecord['status']) {
  return client.query(
    'UPDATE payments SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [paymentId, status],
  );
}

export async function saveBookingStatus(
  client: PoolClient,
  bookingId: string,
  status: 'confirmed' | 'cancelled',
) {
  return client.query(
    `UPDATE bookings SET status = $2, expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status IN ('pending', 'confirmed')`,
    [bookingId, status],
  );
}

export async function insertPaymentNotification(
  client: PoolClient,
  userId: string,
  type: string,
  message: string,
  data: Record<string, string>,
) {
  return client.query(
    `INSERT INTO notifications (user_id, type, message, data)
     VALUES ($1, $2, $3, $4::JSONB)`,
    [userId, type, message, JSON.stringify(data)],
  );
}

export async function findBookingByIdForUpdate(client: PoolClient, bookingId: string) {
  return client.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
}

export async function findLatestBookingPayment(client: PoolClient, bookingId: string) {
  return client.query<PaymentRecord>(
    `SELECT * FROM payments WHERE booking_id = $1
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
    [bookingId],
  );
}

export async function saveRefundIdempotencyKey(
  client: PoolClient,
  paymentId: string,
  key: string,
) {
  return client.query<PaymentRecord>(
    `UPDATE payments SET refund_idempotency_key = COALESCE(refund_idempotency_key, $2),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [paymentId, key],
  );
}
