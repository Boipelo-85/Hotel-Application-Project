import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test, { type TestContext } from 'node:test';
import { createApp } from '../src/app.js';
import { initializeDatabase, closeDatabase } from '../src/config/database.js';
import { loadConfig } from '../src/config/env.js';
import { installPaymentProvider, type CheckoutRequest } from '../src/config/payment.js';
import { processVerifiedPaymentEvent } from '../src/services/payment.service.js';

const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@localhost/test',
  OTP_PEPPER: 'test-only-pepper-at-least-32-characters-long', JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters-long' });
let checkout: CheckoutRequest | undefined;
let refunds = 0;
installPaymentProvider({ name: 'test',
  async createCheckout(input) { checkout = input; return { checkoutUrl: 'https://checkout.example.test/pay', transactionReference: 'guest-reference' }; },
  async verifyWebhook() { return null; },
  async verifyTransaction(reference) { return { eventId: 'charge-1', transactionReference: reference, status: 'successful', amount: '2400.00', currency: 'ZAR' }; },
  async requestRefund() { refunds++; },
});

async function fixture(context: TestContext) {
  refunds = 0; checkout = undefined;
  const booking = { id: '7', user_id: null as string | null, booking_reference: 'HB-GUEST-SECRET', guest_email: 'guest@example.test',
    status: 'pending', expires_at: new Date(Date.now() + 900000), total_amount: '2400.00', currency: 'ZAR',
    check_in: '2099-01-01', check_out: '2099-01-03', manager_user_id: '42' };
  let payment: any;
  let emails = 0;
  const events = new Set<string>();
  const execute = async (sql: string, values: any[] = []) => {
    let rows: any[] = [];
    if (sql.includes('INSERT INTO auth_rate_limits')) rows = [{ hit_count: 1 }];
    else if (sql.includes("to_regclass('booking_email_outbox')")) rows = [{ available: true }];
    else if (sql.includes('INSERT INTO booking_email_outbox')) { emails++; }
    else if (sql.includes('FROM payment_events')) rows = events.has(values[1]) ? [{ id: '1' }] : [];
    else if (sql.includes('INSERT INTO payment_events')) { events.add(values[1]); rows = [{ id: '1' }]; }
    else if (sql.includes('UPDATE bookings')) { booking.status = values[1]; rows = [booking]; }
    else if (sql.includes('FROM bookings b') && sql.includes('UPPER(b.booking_reference)')) {
      rows = values[0] === booking.booking_reference && values[1].toLowerCase() === booking.guest_email && booking.user_id === null ? [booking] : [];
    } else if (sql.includes('FROM bookings')) rows = values[0] === booking.id ? [booking] : [];
    else if (sql.includes('INSERT INTO payments')) {
      payment = { id: '9', booking_id: booking.id, provider: 'test', status: 'pending', amount: values[2], currency: values[3],
        payment_method: values[4], idempotency_key: values[5], checkout_url: null, provider_transaction_reference: null,
        refund_idempotency_key: null, refund_requested_at: null };
      rows = [payment];
    } else if (sql.includes('UPDATE payments')) {
      if (sql.includes('checkout_url')) { payment.provider_transaction_reference = values[1]; payment.checkout_url = values[2]; }
      else if (sql.includes('refund_idempotency_key')) { payment.refund_idempotency_key = values[1]; payment.refund_requested_at = new Date(); }
      else payment.status = values[1];
      rows = [payment];
    } else if (sql.includes('FROM payments p')) {
      rows = payment && values[1] === payment.provider_transaction_reference && values[2] === null && values[3] === booking.id
        ? [{ ...payment, booking_status: booking.status }] : [];
    } else if (sql.includes('FROM payments')) {
      if (payment) rows = [payment];
    }
    return { rows, rowCount: rows.length };
  };
  const pool = initializeDatabase(config); context.after(closeDatabase);
  context.mock.method(pool, 'query', execute);
  context.mock.method(pool, 'connect', async () => ({ query: execute, release() {} }));
  const server = createApp(config).listen(0); await once(server, 'listening');
  context.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const post = (path: string, body: unknown, cookie = '') => fetch(base + path, { method: 'POST',
    headers: { Origin: config.APP_ORIGIN, 'Content-Type': 'application/json', Cookie: cookie, 'Idempotency-Key': 'test-checkout-123' }, body: JSON.stringify(body) });
  const lookup = await post('/bookings/lookup', { reference: booking.booking_reference, email: booking.guest_email });
  assert.equal(lookup.status, 200);
  const setCookie = lookup.headers.getSetCookie()[0]!;
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/);
  const cookie = setCookie.split(';')[0]!;
  return { booking, base, post, cookie, emails: () => emails };
}

test('guest access is bound to one guest reservation and requires the reference and email', async context => {
  const f = await fixture(context);
  assert.equal((await f.post('/bookings/lookup', { reference: f.booking.booking_reference, email: 'wrong@example.test' })).status, 404);
  assert.equal((await fetch(f.base + '/guest-bookings/7')).status, 401);
  assert.equal((await fetch(f.base + '/guest-bookings/8', { headers: { Cookie: f.cookie } })).status, 401);
  const own = await fetch(f.base + '/guest-bookings/7', { headers: { Cookie: f.cookie } });
  assert.equal(own.status, 200); assert.equal((await own.json()).booking.manager_user_id, undefined);
  f.booking.user_id = '10';
  assert.equal((await fetch(f.base + '/guest-bookings/7', { headers: { Cookie: f.cookie } })).status, 404);
});

test('guest checkout uses stored amount and email, verifies payment and queues one confirmation', async context => {
  const f = await fixture(context);
  assert.equal((await f.post('/guest-bookings/7/checkout', { paymentMethod: 'card', amount: '1' }, f.cookie)).status, 400);
  assert.equal((await f.post('/guest-bookings/7/checkout', { paymentMethod: 'eft' }, f.cookie)).status, 200);
  assert.equal(checkout?.amount, '2400.00'); assert.equal(checkout?.customerEmail, 'guest@example.test');
  assert.equal(checkout?.guestBookingId, '7');
  assert.equal((await f.post('/guest-bookings/7/verify', { reference: 'someone-elses-reference' }, f.cookie)).status, 404);
  const verified = await f.post('/guest-bookings/7/verify', { reference: 'guest-reference' }, f.cookie);
  assert.equal(verified.status, 200); assert.equal((await verified.json()).bookingStatus, 'confirmed');
  assert.equal(f.emails(), 1);
  assert.equal((await f.post('/guest-bookings/7/verify', { reference: 'guest-reference' }, f.cookie)).status, 200);
  assert.equal(f.emails(), 1);
});

test('guest can cancel an unpaid booking, but cannot cancel during active checkout', async context => {
  const f = await fixture(context);
  assert.equal((await f.post('/guest-bookings/7/cancel', {}, f.cookie)).status, 200);
  assert.equal(f.booking.status, 'cancelled');
});

test('paid guest cancellation requests one refund and cancels only after verified refund', async context => {
  const f = await fixture(context);
  await f.post('/guest-bookings/7/checkout', { paymentMethod: 'card' }, f.cookie);
  assert.equal((await f.post('/guest-bookings/7/cancel', {}, f.cookie)).status, 409);
  await f.post('/guest-bookings/7/verify', { reference: 'guest-reference' }, f.cookie);
  for (let i = 0; i < 2; i++) assert.equal((await f.post('/guest-bookings/7/cancel', {}, f.cookie)).status, 202);
  assert.equal(refunds, 1); assert.equal(f.booking.status, 'confirmed');
  await processVerifiedPaymentEvent('test', { eventId: 'refund-1', transactionReference: 'guest-reference', status: 'refunded', amount: '2400.00', currency: 'ZAR' });
  assert.equal(f.booking.status, 'cancelled'); assert.equal(f.emails(), 2);
});
