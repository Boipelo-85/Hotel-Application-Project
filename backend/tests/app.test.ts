import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

test('serves health checks and rejects cross-origin state-changing requests', async (context) => {
  const app = createApp(loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://hotel_app:unused@localhost:5432/hotel_app',
    OTP_PEPPER: 'test-only-secret-value-that-is-at-least-32-chars',
    APP_ORIGIN: 'http://localhost:5173',
  }));
  const server = app.listen(0);
  await once(server, 'listening');
  context.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const logs: unknown[] = [];
  const originalInfo = console.info;
  console.info = (message?: unknown) => logs.push(message);
  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    assert.equal(health.headers.get('x-powered-by'), null);

    const mutation = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST' });
    assert.equal(mutation.status, 403);

    const logoutWithoutSession = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(logoutWithoutSession.status, 401);

    for (const path of [
      '/api/v1/bookings',
      '/api/v1/favourites',
      '/api/v1/notifications',
      '/api/v1/payments',
      '/api/v1/users/profile',
    ]) {
      const protectedRoute = await fetch(`${baseUrl}${path}`);
      assert.equal(protectedRoute.status, 401, `${path} should require authentication`);
    }

    const invalidRoomFilter = await fetch(`${baseUrl}/api/v1/rooms?hotelId=not-a-number`);
    assert.equal(invalidRoomFilter.status, 400);
    assert.equal((await invalidRoomFilter.json()).error, 'VALIDATION_ERROR');

    const missingRoute = await fetch(`${baseUrl}/api/v1/does-not-exist?private=value`);
    assert.equal(missingRoute.status, 404);
    assert.deepEqual(await missingRoute.json(), {
      error: 'NOT_FOUND',
      message: 'Route not found',
    });
  } finally {
    console.info = originalInfo;
  }

  assert.ok(logs.length >= 4);
  const loggedRequest = logs.find(
    (entry): entry is { method: string; path: string; statusCode: number; durationMs: number } =>
      typeof entry === 'object' && entry !== null && 'path' in entry &&
      (entry as { path?: unknown }).path === '/api/v1/does-not-exist',
  );
  assert.deepEqual(loggedRequest && {
    method: loggedRequest.method,
    path: loggedRequest.path,
    statusCode: loggedRequest.statusCode,
  }, {
    method: 'GET',
    path: '/api/v1/does-not-exist',
    statusCode: 404,
  });
  assert.equal(loggedRequest && 'durationMs' in loggedRequest, true);
});
