import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { closeDatabase, initializeDatabase, query } from '../src/config/database.js';
import { loadConfig } from '../src/config/env.js';
import { createBooking } from '../src/services/booking.service.js';
import {
  assignBranchManager,
  listBranches,
  searchAvailableBranches,
  updateBranch,
} from '../src/services/branch.service.js';
import { AppError } from '../src/utils/errors.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const testConfig = testDatabaseUrl
  ? loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      OTP_PEPPER: 'test-only-secret-value-that-is-at-least-32-chars',
    })
  : undefined;

if (testConfig) {
  initializeDatabase(testConfig);
}

after(async () => {
  if (testConfig) {
    await closeDatabase();
  }
});

async function createFixture(
  city = 'Polokwane',
  province = 'Limpopo',
): Promise<{
  userId: string;
  branchId: string;
  roomId: string;
}> {
  const user = await query<{ id: string }>(
    `
      INSERT INTO users (name, email, role, email_verified)
      VALUES ('Availability integration test', $1, 'customer', TRUE)
      RETURNING id
    `,
    [`availability-${randomUUID()}@example.test`],
  );

  const branch = await query<{ id: string }>(
    `
      INSERT INTO branches (
        name,
        city,
        province,
        address,
        price_per_night,
        publication_status
      )
      VALUES (
        'Availability test branch',
        $1,
        $2,
        'Test address',
        100,
        'published'
      )
      RETURNING id
    `,
    [city, province],
  );

  const room = await query<{ id: string }>(
    `
      INSERT INTO rooms (
        branch_id,
        room_type,
        capacity,
        quantity,
        price,
        currency
      )
      VALUES ($1, 'Test room', 2, 1, 100, 'USD')
      RETURNING id
    `,
    [branch.rows[0].id],
  );

  return {
    userId: user.rows[0].id,
    branchId: branch.rows[0].id,
    roomId: room.rows[0].id,
  };
}

async function cleanupFixture(
  fixture: Awaited<ReturnType<typeof createFixture>>,
): Promise<void> {
  await query('DELETE FROM bookings WHERE room_id = $1', [fixture.roomId]);

  await query('DELETE FROM notifications WHERE user_id = $1', [
    fixture.userId,
  ]);

  await query('DELETE FROM rooms WHERE id = $1', [fixture.roomId]);

  await query('DELETE FROM branches WHERE id = $1', [fixture.branchId]);

  await query('DELETE FROM users WHERE id = $1', [fixture.userId]);
}

function dates(offset: number): {
  checkIn: string;
  checkOut: string;
} {
  const start = new Date();

  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offset);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    checkIn: start.toISOString().slice(0, 10),
    checkOut: end.toISOString().slice(0, 10),
  };
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
        (error: unknown) =>
          error instanceof AppError &&
          error.code === 'NO_INVENTORY',
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

      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );

      const rejected = results.filter(
        (result) => result.status === 'rejected',
      );

      assert.equal(fulfilled.length, 1);
      assert.equal(rejected.length, 1);

      const rejection = rejected[0];

      assert.ok(rejection.status === 'rejected');
      assert.ok(rejection.reason instanceof AppError);
      assert.equal(rejection.reason.code, 'NO_INVENTORY');

      const bookingCount = await query<{ count: string }>(
        `
          SELECT COUNT(*) AS count
          FROM bookings
          WHERE room_id = $1
        `,
        [fixture.roomId],
      );

      assert.equal(Number(bookingCount.rows[0].count), 1);
    } finally {
      await cleanupFixture(fixture);
    }
  },
);

test(
  'keeps branch rooms and bookings separate under one hotel brand',
  { skip: !testConfig },
  async () => {
    const polokwane = await createFixture();
    const pretoria = await createFixture('Pretoria', 'Gauteng');

    try {
      const brand = await query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM hotel_brand',
      );
      const branches = await query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT brand_id) AS count
          FROM branches
          WHERE id = ANY($1::BIGINT[])
        `,
        [[polokwane.branchId, pretoria.branchId]],
      );

      assert.equal(Number(brand.rows[0].count), 1);
      assert.equal(Number(branches.rows[0].count), 1);

      const pretoriaResults = await listBranches(undefined, 'pretoria');
      const matchingBranchIds = pretoriaResults.map(
        (branch) => (branch as { id: string }).id,
      );
      assert.ok(matchingBranchIds.includes(pretoria.branchId));
      assert.ok(!matchingBranchIds.includes(polokwane.branchId));

      const requestedDates = dates(9);
      const searchResults = await searchAvailableBranches({
        destination: 'Pretoria',
        ...requestedDates,
        rooms: 1,
        guests: 2,
      });
      const matchingSearchIds = searchResults.map(
        (result) => (result as { branch: { id: string } }).branch.id,
      );
      assert.ok(matchingSearchIds.includes(pretoria.branchId));
      assert.ok(!matchingSearchIds.includes(polokwane.branchId));
      const matchingRoomOption = searchResults.find(
        (result) => (result as { branch: { id: string } }).branch.id === pretoria.branchId,
      ) as {
        branch: { id: string };
        roomType: string;
        price: string;
        availableRooms: number;
      } | undefined;
      assert.ok(matchingRoomOption);
      assert.equal(matchingRoomOption.roomType, 'Test room');
      assert.equal(matchingRoomOption.price, '100.00');
      assert.equal(matchingRoomOption.availableRooms, 1);

      const first = await createBooking(polokwane.userId, {
        roomId: polokwane.roomId,
        ...requestedDates,
        guests: 1,
        quantity: 1,
      });
      const second = await createBooking(pretoria.userId, {
        roomId: pretoria.roomId,
        ...requestedDates,
        guests: 1,
        quantity: 1,
      });

      assert.notEqual(first.room_id, second.room_id);
      assert.equal(first.status, 'pending');
      assert.equal(second.status, 'pending');
    } finally {
      await cleanupFixture(polokwane);
      await cleanupFixture(pretoria);
    }
  },
);

test(
  'limits branch manager access to branches assigned by an admin',
  { skip: !testConfig },
  async () => {
    const assigned = await createFixture();
    const unassigned = await createFixture('Pretoria', 'Gauteng');

    try {
      await query(`UPDATE users SET role = 'branch_manager' WHERE id = $1`, [assigned.userId]);
      await assignBranchManager(assigned.branchId, assigned.userId);

      const manager = { id: assigned.userId, role: 'branch_manager' as const };
      const updated = await updateBranch(assigned.branchId, manager, { name: 'Managed branch' }) as {
        name: string;
      };
      assert.equal(updated.name, 'Managed branch');
      await assert.rejects(
        updateBranch(unassigned.branchId, manager, { name: 'Unauthorized update' }),
        (error: unknown) => error instanceof AppError && error.code === 'FORBIDDEN',
      );
    } finally {
      await cleanupFixture(assigned);
      await cleanupFixture(unassigned);
    }
  },
);
