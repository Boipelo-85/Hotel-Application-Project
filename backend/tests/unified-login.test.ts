import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test, { type TestContext } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { initializeDatabase, closeDatabase } from '../src/config/database.js';
import { loginUser } from '../src/services/login.service.js';
import { hashPassword } from '../src/utils/password.js';
import { hashSessionToken } from '../src/utils/session.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const config = loadConfig({
  NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@localhost/test', APP_ORIGIN: 'http://localhost:5173',
  OTP_PEPPER: 'test-only-pepper-at-least-32-characters-long',
  JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters-long',
  ADMIN_LOGIN_EMAIL: 'admin@example.test', ADMIN_LOGIN_PASSWORD: 'Admin-password-123!',
});
const admin = { id: '1', name: 'Admin User', email: 'admin@example.test', role: 'admin', email_verified: true,
  is_active: true, password_hash: null, phone: null, created_at: new Date(), updated_at: new Date() };

async function fixture(context: TestContext, { adminExists = true } = {}) {
  const password = 'Customer-password-123!';
  const customer = { ...admin, id: '2', role: 'customer', email: 'traveler@example.test', password_hash: await hashPassword(password) };
  const calls: Array<{ sql: string; values: any[] }> = [];
  const sessions = new Map<string, string>();
  const limits = new Map<string, number>();
  const execute = async (sql: string, values: any[] = []) => {
    calls.push({ sql, values });
    let rows: any[] = [];
    if (sql.includes('INSERT INTO auth_rate_limits')) {
      const key = values[0].toString('hex'); const count = (limits.get(key) || 0) + 1;
      limits.set(key, count); rows = [{ hit_count: count }];
    } else if (sql.includes("role = 'admin'")) rows = adminExists ? [admin] : [];
    else if (sql.includes('FROM users') && sql.includes('LOWER(BTRIM(email))')) rows = values[0] === customer.email ? [customer] : [];
    else if (sql.includes('INSERT INTO users')) rows = [{ ...customer, id: '3', name: values[0], email: values[1], password_hash: values[2], email_verified: false }];
    else if (sql.includes('INSERT INTO auth_sessions')) sessions.set(values[0].toString('hex'), values[1]);
    else if (sql.includes('DELETE FROM auth_sessions')) sessions.delete(values[0].toString('hex'));
    else if (sql.includes('FROM auth_sessions')) rows = sessions.has(values[0].toString('hex')) ? [admin] : [];
    else if (sql.includes('SELECT') && sql.includes('COUNT')) rows = [{}];
    return { rows, rowCount: rows.length };
  };
  const pool = initializeDatabase(config);
  context.after(closeDatabase);
  context.mock.method(pool, 'query', execute);
  context.mock.method(pool, 'connect', async () => ({ query: execute, release() {} }));
  const server = createApp(config).listen(0);
  await once(server, 'listening');
  context.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, cookie?: string) => fetch(base + '/api/v1' + path, {
    method: 'POST', headers: { Origin: config.APP_ORIGIN, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  });
  return { base, post, calls, sessions, customer, password };
}

test('admin uses unified login, gets a random hashed session, and logout revokes it', async context => {
  const f = await fixture(context);
  const first = await f.post('/auth/login', { email: 'ADMIN@EXAMPLE.TEST', password: config.ADMIN_LOGIN_PASSWORD });
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.deepEqual(body.user, { id: admin.id, name: admin.name, email: admin.email, role: 'admin', email_verified: true, phone: null });
  const cookie = first.headers.getSetCookie().find(value => value.startsWith('hotel_session='))!;
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
  const token = cookie.split(';')[0].split('=')[1];
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.ok(f.sessions.has(hashSessionToken(token).toString('hex')));
  assert.ok(!f.calls.some(call => call.sql.includes('password_hash') && call.sql.includes('SELECT')));
  assert.ok(!f.calls.some(call => /INSERT INTO users|UPDATE users/.test(call.sql)));
  const second = await f.post('/auth/login', { email: admin.email, password: config.ADMIN_LOGIN_PASSWORD });
  assert.notEqual(second.headers.getSetCookie().find(value => value.startsWith('hotel_session='))!.split(';')[0], cookie.split(';')[0]);
  const access = await fetch(f.base + '/api/v1/admin/dashboard/stats', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(access.status, 200);
  assert.equal((await f.post('/auth/logout', {}, cookie.split(';')[0])).status, 204);
  assert.ok(!f.sessions.has(hashSessionToken(token).toString('hex')));
  assert.equal((await fetch(f.base + '/api/v1/admin/dashboard/stats', { headers: { Cookie: cookie.split(';')[0] } })).status, 401);
});

test('wrong admin passwords never fall through to database password authentication', async context => {
  const f = await fixture(context);
  for (const password of ['wrong', 'X'.repeat(config.ADMIN_LOGIN_PASSWORD!.length), '😀'.repeat(20)]) {
    const response = await f.post('/auth/login', { email: admin.email.toUpperCase(), password });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.message, 'Invalid email or password');
  }
  assert.ok(f.calls.every(call => call.sql.includes('auth_rate_limits')));
  assert.equal(f.sessions.size, 0);
});

test('correct configured credentials still require an existing active seeded admin', async context => {
  await fixture(context, { adminExists: false });
  await assert.rejects(loginUser(config, { email: admin.email, password: config.ADMIN_LOGIN_PASSWORD! }),
    (error: any) => error.statusCode === 401 && error.message === 'Invalid email or password');
});

test('customer password login and registration keep their existing JWT cookies', async context => {
  const f = await fixture(context);
  const login = await f.post('/auth/login', { email: f.customer.email, password: f.password });
  assert.equal(login.status, 200); assert.equal((await login.json()).user.role, 'customer');
  assert.ok(login.headers.getSetCookie().some(cookie => /^access_token=ey/.test(cookie)));
  assert.ok(login.headers.getSetCookie().some(cookie => /^refresh_token=ey/.test(cookie)));
  const registered = await f.post('/auth/register', { name: 'New Traveler', email: 'new@example.test', password: f.password, confirmPassword: f.password });
  assert.equal(registered.status, 201); assert.equal((await registered.json()).user.role, 'customer');
  assert.ok(registered.headers.getSetCookie().some(cookie => /^access_token=ey/.test(cookie)));
});

test('registration reserves the configured admin email even before seeding', async context => {
  const f = await fixture(context, { adminExists: false });
  const response = await f.post('/auth/register', { name: 'Other User', email: admin.email.toUpperCase(), password: f.password, confirmPassword: f.password });
  assert.equal(response.status, 409);
  assert.ok(!f.calls.some(call => call.sql.includes('INSERT INTO users')));
});

test('staff API requires authentication and role checks, and the old login endpoint is removed', async context => {
  const f = await fixture(context);
  const customerCookie = 'access_token=' + generateAccessToken({ userId: '2', email: f.customer.email, role: 'customer' }, config);
  for (const path of ['/dashboard/stats', '/dashboard/recent-bookings', '/reports/branches', '/reports/users', '/reports/availability', '/reports/revenue', '/users', '/bookings']) {
    assert.equal((await fetch(f.base + '/api/v1/admin' + path)).status, 401, path);
    assert.equal((await fetch(f.base + '/api/v1/admin' + path, { headers: { Cookie: customerCookie } })).status, 403, path);
  }
  const managerCookie = 'access_token=' + generateAccessToken({ userId: '3', email: 'manager@example.test', role: 'branch_manager' }, config);
  assert.equal((await fetch(f.base + '/api/v1/admin/dashboard/stats', { headers: { Cookie: managerCookie } })).status, 200);
  const adminCookie = 'access_token=' + generateAccessToken({ userId: '1', email: admin.email, role: 'admin' }, config);
  assert.equal((await f.post('/admin/login', { email: admin.email, password: config.ADMIN_LOGIN_PASSWORD }, adminCookie)).status, 404);
});

test('admin attempts use the same five-attempt login rate limit', async context => {
  const f = await fixture(context);
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await f.post('/auth/login', { email: admin.email, password: 'incorrect' })).status, 401);
  assert.equal((await f.post('/auth/login', { email: admin.email, password: config.ADMIN_LOGIN_PASSWORD })).status, 429);
});
