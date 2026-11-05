import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import sharp from 'sharp';
import nodemailer from 'nodemailer';
import { deliverBookingEmails } from '../src/services/booking-email.service.js';
import { normalizeImage } from '../src/middleware/uploadMiddleware.js';
import { createAuthMiddleware } from '../src/middleware/authMiddleware.js';
import { loadConfig } from '../src/config/env.js';
import { initializeDatabase, closeDatabase } from '../src/config/database.js';
import { issueAccessToken } from '../src/services/access-token.service.js';
import { logoutAllSessions } from '../src/services/session.service.js';
import { applyMigrations, migrationFiles, migrationSource } from '../src/services/migration.service.js';

const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@localhost/test',
  OTP_PEPPER: 'test-only-pepper-at-least-32-characters-long', JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters-long' });

test('account role, deactivation and logout-all apply to an already-issued access cookie', async context => {
  const user = { id: '42', email: 'staff@example.test', role: 'branch_manager', active: true };
  let session = true;
  const execute = async (sql: string) => {
    if (sql.includes('DELETE FROM auth_sessions')) session = false;
    return { rows: sql.includes('FROM auth_sessions') && session && user.active ? [user] : [], rowCount: 1 };
  };
  const pool = initializeDatabase(config); context.after(closeDatabase);
  context.mock.method(pool, 'query', execute);
  const client = { query: execute, release() {} };
  context.mock.method(pool, 'connect', async () => client);
  const token = await issueAccessToken(client as unknown as PoolClient, { userId: user.id, email: user.email, role: user.role }, config);
  const authenticate = () => new Promise<Request>((resolve, reject) => {
    const req = { headers: { cookie: `access_token=${token}` } } as Request;
    createAuthMiddleware('hotel_session', config)(req, {} as Response, err => err ? reject(err) : resolve(req));
  });
  assert.equal((await authenticate()).auth?.role, 'branch_manager');
  user.role = 'customer'; assert.equal((await authenticate()).auth?.role, 'customer');
  user.active = false; await assert.rejects(authenticate(), { statusCode: 401 });
  user.active = true; await logoutAllSessions(user.id);
  await assert.rejects(authenticate(), { statusCode: 401 });
});

test('uploads reject disguised content and decode supported images into clean WebP', async () => {
  await assert.rejects(normalizeImage(Buffer.from('<script>alert(1)</script>')), { code: 'INVALID_IMAGE_CONTENT' });
  await assert.rejects(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')), { code: 'INVALID_IMAGE_CONTENT' });
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#123456' } }).png().toBuffer();
  const output = await normalizeImage(Buffer.concat([png, Buffer.from('injected-payload')]));
  assert.equal((await sharp(output).metadata()).format, 'webp');
  assert.equal(output.includes(Buffer.from('injected-payload')), false);
  await assert.rejects(normalizeImage(png.subarray(0, 30)), { code: 'INVALID_IMAGE_CONTENT' });
});

test('migration runner records order, skips applied files and rejects changed checksums', async () => {
  const ledger = new Map<string, string>();
  let statements = 0;
  const client = { async query(sql: string, values: string[] = []) {
    if (sql.startsWith('SELECT checksum')) return { rows: ledger.has(values[0]!) ? [{ checksum: ledger.get(values[0]!) }] : [] };
    if (sql.startsWith('INSERT INTO schema_migrations')) ledger.set(values[0]!, values[1]!);
    else if (!sql.includes('pg_advisory_xact_lock') && !sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) statements++;
    return { rows: [] };
  } } as unknown as PoolClient;
  await applyMigrations(client);
  assert.deepEqual([...ledger.keys()], migrationFiles());
  const count = statements; await applyMigrations(client); assert.equal(statements, count);
  const first = migrationFiles()[0]!; ledger.set(first, 'tampered');
  await assert.rejects(applyMigrations(client), /Applied migration has changed/);
  assert.doesNotMatch(migrationSource(first).sql, /^\s*(BEGIN|COMMIT);/im);
});

test('booking email delivery keeps failed messages queued and marks successful retries sent', async context => {
  let eligible = true;
  let sent = false;
  let fail = true;
  const outcomes: boolean[] = [];
  const execute = async (sql: string, values: unknown[] = []) => {
    if (sql.includes('FROM booking_email_outbox')) return { rows: eligible && !sent
      ? [{ id: '1', recipient: 'guest@example.test', subject: 'Booking confirmed', body: 'Your stay is confirmed.' }] : [] };
    if (sql.includes('UPDATE booking_email_outbox')) { eligible = false; sent = values[1] === true; outcomes.push(sent); }
    return { rows: [] };
  };
  const pool = initializeDatabase(config); context.after(closeDatabase);
  context.mock.method(pool, 'connect', async () => ({ query: execute, release() {} }));
  context.mock.method(nodemailer, 'createTransport', (() => ({
    async sendMail(mail: { to: string }) { assert.equal(mail.to, 'guest@example.test'); if (fail) throw new Error('Temporary SMTP outage'); },
    close() {},
  })) as typeof nodemailer.createTransport);
  const emailConfig = { ...config, SMTP_HOST: 'smtp.example.test', SMTP_FROM: 'hotel@example.test' };
  await deliverBookingEmails(emailConfig); assert.equal(sent, false);
  fail = false; eligible = true;
  await deliverBookingEmails(emailConfig); assert.equal(sent, true);
  await deliverBookingEmails(emailConfig); assert.deepEqual(outcomes, [false, true]);
});
