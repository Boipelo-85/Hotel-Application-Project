import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckout } from '../src/services/payment.service.js';
import { AppError } from '../src/utils/errors.js';

test('does not create a checkout when no payment provider is configured', async () => {
  await assert.rejects(
    createCheckout('42', '100', 'checkout-test-card', 'card'),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 503 &&
      error.code === 'PAYMENTS_UNAVAILABLE',
  );
});
