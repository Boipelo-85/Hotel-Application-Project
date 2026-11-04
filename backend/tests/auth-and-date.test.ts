import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAuthMiddleware, createOptionalAuthMiddleware, getCookie } from '../src/middleware/authMiddleware.js';
import { countNights } from '../src/services/availability.service.js';
import { createBooking } from '../src/services/booking.service.js';
import { loadConfig } from '../src/config/env.js';
import { AppError } from '../src/utils/errors.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const authConfig = loadConfig({
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: '******localhost:5432/hotel_app',
  OTP_PEPPER: 'replace-with-a-random-secret-at-least-32-characters-long',
  JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'replace-with-a-different-random-secret-at-least-32-characters-long',
  APP_ORIGIN: 'http://localhost:5173',
});

test('reads only the requested cookie and safely decodes its value', () => {
  assert.equal(getCookie('other=first; hotel_session=token%2Bvalue', 'hotel_session'), 'token+value');
  assert.equal(getCookie('other=first', 'hotel_session'), undefined);
  assert.equal(getCookie('hotel_session=%E0%A4%A', 'hotel_session'), undefined);
});

test('allows booking requests without a session cookie', () => {
  let nextCalled = false;
  createOptionalAuthMiddleware('hotel_session', authConfig)(
    { headers: {} } as Request,
    {} as Response,
    (error) => {
      assert.ifError(error);
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);
});

test('authenticates JWT access cookies for protected routes', async () => {
  const token = generateAccessToken(
    { userId: '42', email: 'traveler@example.test', role: 'customer' },
    authConfig,
  );
  const request = { headers: { cookie: `access_token=${token}` } } as Request;

  await new Promise<void>((resolve, reject) => {
    createAuthMiddleware('hotel_session', authConfig)(request, {} as Response, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  assert.deepEqual(request.auth, {
    userId: '42',
    email: 'traveler@example.test',
    role: 'customer',
  });
});

test('recognizes JWT access cookies on optional-auth booking routes', async () => {
  const token = generateAccessToken(
    { userId: '42', email: 'traveler@example.test', role: 'customer' },
    authConfig,
  );
  const request = { headers: { cookie: `access_token=${token}` } } as Request;

  await new Promise<void>((resolve, reject) => {
    createOptionalAuthMiddleware('hotel_session', authConfig)(request, {} as Response, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  assert.equal(request.auth?.userId, '42');
});

test('counts valid calendar nights and rejects invalid or reversed ranges', () => {
  assert.equal(countNights('2024-02-28', '2024-03-01'), 2);
  assert.throws(() => countNights('2024-02-30', '2024-03-01'), AppError);
  assert.throws(() => countNights('2024-03-02', '2024-03-01'), AppError);
});

test('requires guest contact details before creating a guest reservation', async () => {
  await assert.rejects(
    createBooking(null, {
      roomId: '1',
      checkIn: '2027-01-01',
      checkOut: '2027-01-02',
      guests: 1,
      quantity: 1,
    }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === 'INVALID_DATA',
  );
});

test('loads the example environment with SMTP intentionally unconfigured', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://hotel_app:replace-me@localhost:5432/hotel_app',
    OTP_PEPPER: 'replace-with-a-random-secret-at-least-32-characters-long',
    JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters-long',
    JWT_REFRESH_SECRET: 'replace-with-a-different-random-secret-at-least-32-characters-long',
    APP_ORIGIN: 'http://localhost:5173',
    SESSION_TTL_HOURS: '168',
    OTP_TTL_MINUTES: '10',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: '',
  });
  assert.equal(config.SMTP_FROM, undefined);
  assert.equal(config.APP_ORIGIN, 'http://localhost:5173');
});
