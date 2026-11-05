import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createPaystackProvider, fromSubunits, toSubunits } from '../src/services/paystack.provider.js';
import { AppError } from '../src/utils/errors.js';

const SECRET = 'sk_test_unit_test_secret';
const CALLBACK = 'http://localhost:5173/payment/callback';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function fakeFetch(body: unknown, status = 200): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function sign(rawBody: string): string {
  return createHmac('sha512', SECRET).update(rawBody).digest('hex');
}

test('converts amounts to and from Paystack currency subunits', () => {
  assert.equal(toSubunits('1234.50', 'ZAR'), '123450');
  assert.equal(toSubunits('99', 'USD'), '9900');
  assert.equal(toSubunits('100', 'XOF'), '100');
  assert.equal(fromSubunits(123450, 'ZAR'), '1234.50');
  assert.equal(fromSubunits('5', 'USD'), '0.05');
  assert.equal(fromSubunits('100', 'XOF'), '100');
  assert.throws(() => toSubunits('12.345', 'USD'), AppError);
  assert.throws(() => fromSubunits(undefined, 'ZAR'), AppError);
});

test('initializes hosted checkout with the correct amount, currency, channel and callback', async () => {
  const { fetchImpl, calls } = fakeFetch({
    status: true,
    message: 'Authorization URL created',
    data: { authorization_url: 'https://checkout.paystack.com/abc', reference: 'HB-BK-1-abc123' },
  });
  const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK, fetchImpl });
  const session = await provider.createCheckout({
    idempotencyKey: 'checkout-1',
    bookingReference: 'BK-1',
    amount: '1500.00',
    currency: 'zar',
    paymentMethod: 'card',
    customerEmail: 'guest@example.com',
  });

  assert.equal(session.checkoutUrl, 'https://checkout.paystack.com/abc');
  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, 'https://api.paystack.co/transaction/initialize');
  const authorization = new Headers(call.init.headers).get('Authorization');
  assert.equal(authorization, `Bearer ${SECRET}`);
  const sent = JSON.parse(String(call.init.body)) as Record<string, unknown>;
  assert.equal(sent.amount, 150000);
  assert.equal(sent.currency, 'ZAR');
  assert.equal(sent.email, 'guest@example.com');
  assert.equal(sent.callback_url, CALLBACK);
  assert.deepEqual(sent.channels, ['card']);
  assert.match(String(sent.reference), /^HB-BK-1-[0-9a-f]{16}$/);
});

test('uses Paystack EFT channel for EFT checkouts', async () => {
  const { fetchImpl, calls } = fakeFetch({
    status: true,
    message: 'ok',
    data: { authorization_url: 'https://checkout.paystack.com/x', reference: 'HB-B1-abcd' },
  });
  const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK, fetchImpl });
  await provider.createCheckout({
    idempotencyKey: 'checkout-2',
    bookingReference: 'B1',
    amount: '10.00',
    currency: 'ZAR',
    paymentMethod: 'eft',
    customerEmail: 'guest@example.com',
  });
  const call = calls[0];
  assert.ok(call);
  const sent = JSON.parse(String(call.init.body)) as Record<string, unknown>;
  assert.deepEqual(sent.channels, ['eft']);
});

test('rejects a checkout without an email or with a non-Paystack URL', async () => {
  const { fetchImpl } = fakeFetch({
    status: true,
    message: 'ok',
    data: { authorization_url: 'https://example.com/checkout', reference: 'HB-B1-abcd' },
  });
  const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK, fetchImpl });
  await assert.rejects(
    provider.createCheckout({
      idempotencyKey: 'checkout-3',
      bookingReference: 'B1',
      amount: '10.00',
      currency: 'ZAR',
      paymentMethod: 'card',
    }),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_DATA',
  );
  await assert.rejects(
    provider.createCheckout({
      idempotencyKey: 'checkout-4',
      bookingReference: 'B1',
      amount: '10.00',
      currency: 'ZAR',
      paymentMethod: 'card',
      customerEmail: 'guest@example.com',
    }),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_PROVIDER_RESPONSE',
  );
});

test('validates webhook signatures and maps successful charges', async () => {
  const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK });
  const rawBody = JSON.stringify({
    event: 'charge.success',
    data: { id: 4099260516, status: 'success', reference: 'HB-1-abc', amount: 150000, currency: 'ZAR' },
  });

  assert.deepEqual(await provider.verifyWebhook(Buffer.from(rawBody), sign(rawBody)), {
    eventId: 'charge.success:4099260516',
    transactionReference: 'HB-1-abc',
    status: 'successful',
    amount: '1500.00',
    currency: 'ZAR',
  });
  await assert.rejects(
    provider.verifyWebhook(Buffer.from(rawBody), 'invalid'),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
});

test('maps processed refunds and acknowledges unrelated signed events', async () => {
  const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK });
  const refund = JSON.stringify({
    event: 'refund.processed',
    data: { transaction_reference: 'HB-1-abc', amount: 150000, currency: 'ZAR' },
  });
  const refunded = await provider.verifyWebhook(Buffer.from(refund), sign(refund));
  assert.equal(refunded?.status, 'refunded');
  assert.equal(refunded?.amount, '1500.00');

  const unrelated = JSON.stringify({ event: 'transfer.success', data: {} });
  assert.equal(await provider.verifyWebhook(Buffer.from(unrelated), sign(unrelated)), null);
});

test('verifies transactions using Paystack and distinguishes success, failure and pending', async () => {
  const getEvent = async (status: string) => {
    const { fetchImpl, calls } = fakeFetch({
      status: true,
      message: 'Verification successful',
      data: { id: 77, status, reference: 'HB-1-abc', amount: 150000, currency: 'ZAR' },
    });
    const provider = createPaystackProvider({ secretKey: SECRET, callbackUrl: CALLBACK, fetchImpl });
    const event = await provider.verifyTransaction?.('HB-1-abc');
    const call = calls[0];
    assert.ok(call);
    assert.equal(call.url, 'https://api.paystack.co/transaction/verify/HB-1-abc');
    return event;
  };

  assert.equal((await getEvent('success'))?.status, 'successful');
  assert.equal((await getEvent('failed'))?.status, 'failed');
  assert.equal(await getEvent('abandoned'), null);
});
