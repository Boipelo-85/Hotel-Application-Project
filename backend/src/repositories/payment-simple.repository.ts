import { query } from '../config/database.js';
import type { Payment, PaymentInput } from '../types/models.js';

export async function createPayment(payment: PaymentInput): Promise<Payment> {
  const result = await query<Payment>(
    'INSERT INTO payments (booking_id, amount, currency, status, payment_method, transaction_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [payment.booking_id, payment.amount, payment.currency, 'pending', payment.payment_method, payment.transaction_id || null]
  );
  return result.rows[0];
}

export async function findPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
  const result = await query<Payment>('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
  return result.rows;
}

export async function updatePaymentStatus(paymentId: number, status: string): Promise<Payment | null> {
  const result = await query<Payment>(
    'UPDATE payments SET status = $1 WHERE payment_id = $2 RETURNING *',
    [status, paymentId]
  );
  return result.rows[0] || null;
}
