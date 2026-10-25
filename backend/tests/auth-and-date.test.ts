import assert from 'node:assert/strict';
import test from 'node:test';
import { getCookie } from '../src/middleware/authMiddleware.js';
import { countNights } from '../src/services/availability.service.js';
import { loadConfig } from '../src/config/env.js';
import { AppError } from '../src/utils/errors.js';

test('reads only the requested cookie and safely decodes its value', () => {
  assert.equal(getCookie('other=first; hotel_session=token%2Bvalue', 'hotel_session'), 'token+value');
  assert.equal(getCookie('other=first', 'hotel_session'), undefined);
  assert.equal(getCookie('hotel_session=%E0%A4%A', 'hotel_session'), undefined);
});

test('counts valid calendar nights and rejects invalid or reversed ranges', () => {
  assert.equal(countNights('2024-02-28', '2024-03-01'), 2);
  assert.throws(() => countNights('2024-02-30', '2024-03-01'), AppError);
  assert.throws(() => countNights('2024-03-02', '2024-03-01'), AppError);
});

test('loads the example environment with SMTP intentionally unconfigured', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://hotel_app:replace-me@localhost:5432/hotel_app',
    OTP_PEPPER: 'replace-with-a-random-secret-at-least-32-characters-long',
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
