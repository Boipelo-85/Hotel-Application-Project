import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { closeDatabase, initializeDatabase, query } from '../src/config/database.js';
import { loadConfig } from '../src/config/env.js';
import { createBooking } from '../src/services/booking.service.js';
import { AppError } from '../src/utils/errors.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testConfig = testDatabaseUrl
  ? loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      OTP_PEPPER: 'test-only-secret-value-that-is-at-least-32-chars',
    })
  : undefined;

if (testConfig) initializeDatabase(testConfig);
after(async () => {
  if (testConfig) await closeDatabase();
});

async function createFixture(): Promise<{
  userId: string;
  hotelId: string;
  roomId: string;
}> {
  const user = await query<{ id: string }>(
    `INSERT INTO users (name, email, role, email_verified)
     VALUES ('Availability integration test', $1, 'customer', TRUE) RETURNING id`,
    [`availability-${randomUUID()}@example.test`],
  );
  const hotel = await query<{ id: string }>(
    `INSERT INTO hotels (name, address, price_per_night, publication_status)
     VALUES ('Availability test hotel', 'Test address', 100, 'published') RETURNING id`,
  );
  const room = await query<{ id: string }>(
    `INSERT INTO rooms (hotel_id, room_type, capacity, quantity, price, currency)
     VALUES ($1, 'Test room', 2, 1, 100, 'USD') RETURNING id`,
    [hotel.rows[0].id],
  );
  return { userId: user.rows[0].id, hotelId: hotel.rows[0].id, roomId: room.rows[0].id };
}

async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<void> {
  await query('DELETE FROM bookings WHERE room_id = $1', [fixture.roomId]);
  await query('DELETE FROM notifications WHERE user_id = $1', [fixture.userId]);
  await query('DELETE FROM hotels WHERE id = $1', [fixture.hotelId]);
  await query('DELETE FROM users WHERE id = $1', [fixture.userId]);
}

function dates(offset: number): { checkIn: string; checkOut: string } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { checkIn: start.toISOString().slice(0, 10), checkOut: end.toISOString().slice(0, 10) };
}

test(
  'blocks overlapping stays but allows same-day checkout and check-in',
  { skip: !testConfig },
  async () => {
    const fixture = await createFixture();
    try {
      const firstDates = dates(3);
      const first = await createBooking(fixture.userId, {
        roomId: fixture.roomId,
        ...firstDates,
        guests: 1,
        quantity: 1,
      });
      await assert.rejects(
        createBooking(fixture.userId, {
          roomId: fixture.roomId,
          ...dates(3),
          guests: 1,
          quantity: 1,
        }),
        (error: unknown) => error instanceof AppError && error.code === 'NO_INVENTORY',
      );

      const adjacent = await createBooking(fixture.userId, {
        roomId: fixture.roomId,
        checkIn: first.check_out,
        checkOut: dates(4).checkOut,
        guests: 1,
        quantity: 1,
      });
      assert.equal(adjacent.status, 'pending');
    } finally {
      await cleanupFixture(fixture);
    }
  },
);

test(
  'serializes simultaneous requests so one-unit inventory cannot be overbooked',
  { skip: !testConfig },
  async () => {
    const fixture = await createFixture();
    try {
      const requestedDates = dates(6);
      const results = await Promise.allSettled([
        createBooking(fixture.userId, {
          roomId: fixture.roomId,
          ...requestedDates,
          guests: 1,
          quantity: 1,
        }),
        createBooking(fixture.userId, {
          roomId: fixture.roomId,
          ...requestedDates,
          guests: 1,
          quantity: 1,
        }),
      ]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    } finally {
      await cleanupFixture(fixture);
    }
  },
);
