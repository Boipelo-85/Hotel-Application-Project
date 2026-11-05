import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import passport from 'passport';
import type { PoolClient } from 'pg';
import { loadConfig } from '../src/config/env.js';
import { configurePassport } from '../src/config/passport.js';
import { googleAuthController, googleCallbackController, facebookAuthController, facebookCallbackController } from '../src/controllers/oauth.controller.js';
import { createUser } from '../src/repositories/user.repository.js';

const config = loadConfig({
  NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@localhost/hotel_test',
  OTP_PEPPER: 'test-only-secret-at-least-32-characters-long',
  JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters-long',
  APP_ORIGIN: 'http://localhost:5173',
  GOOGLE_CLIENT_ID: 'test-google', GOOGLE_CLIENT_SECRET: 'test-google-secret',
  FACEBOOK_CLIENT_ID: 'test-facebook', FACEBOOK_CLIENT_SECRET: 'test-facebook-secret',
});

for (const provider of ['google', 'facebook'] as const) {
  test(`${provider} completes OAuth without server sessions and rejects unbound callbacks`, async (context) => {
    let authentications = 0;
    // Exercise real Passport middleware while replacing only the external provider.
    passport.use(provider, {
      name: provider,
      authenticate(request: express.Request, options: { state?: string; session?: boolean }) {
        assert.equal(options.session, false);
        if (request.query.code === 'valid') {
          authentications++;
          this.success({ user: { id: '42' }, accessToken: 'access-test', refreshToken: 'refresh-test' });
        } else if (request.query.code === 'error') {
          this.error(new Error('Provider unavailable'));
        } else if (request.query.code === 'denied') {
          this.fail();
        } else {
          this.redirect('https://provider.example/authorize?state=' + options.state);
        }
      },
    } as passport.Strategy);
    context.after(() => passport.unuse(provider));
    const app = express();
    app.use(passport.initialize());
    app.get('/start', provider === 'google' ? googleAuthController(config) : facebookAuthController(config));
    app.get('/callback', ...(provider === 'google' ? googleCallbackController(config, 'hotel_session') : facebookCallbackController(config, 'hotel_session')));
    const server = app.listen(0);
    await once(server, 'listening');
    context.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const start = await fetch(base + '/start', { redirect: 'manual' });
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    assert.match(state, /^[a-f0-9]{64}$/);
    const setCookie = start.headers.getSetCookie()[0];
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(';')[0];
    for (const [query, headers] of [
      ['code=valid', { Cookie: cookie }],
      [`code=valid&state=${state}`, {}],
      [`code=valid&state=${'a'.repeat(64)}`, { Cookie: cookie }],
      [`code=valid&state=${state}&state=${state}`, { Cookie: cookie }],
    ] as const) {
      const rejected = await fetch(base + '/callback?' + query, { redirect: 'manual', headers });
      assert.equal(rejected.headers.get('location'), config.APP_ORIGIN + '/login?error=oauth_failed');
      assert.ok(rejected.headers.getSetCookie().every(value => !value.startsWith('access_token=')));
    }
    assert.equal(authentications, 0);
    const success = await fetch(base + `/callback?code=valid&state=${state}`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(success.status, 302);
    assert.equal(success.headers.get('location'), config.APP_ORIGIN + '/auth/callback?login=success');
    const cookies = success.headers.getSetCookie();
    assert.ok(cookies.some(value => value.startsWith('access_token=access-test;') && value.includes('HttpOnly')));
    assert.ok(cookies.some(value => value.startsWith('refresh_token=refresh-test;')));
    assert.ok(cookies.some(value => value.startsWith(`oauth_state_${provider}=;`)));
    assert.equal(authentications, 1);
    const denied = await fetch(base + `/callback?code=denied&state=${state}`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(denied.headers.get('location'), config.APP_ORIGIN + '/login?error=oauth_failed');
    const failed = await fetch(base + `/callback?code=error&state=${state}`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(failed.headers.get('location'), config.APP_ORIGIN + '/login?error=oauth_failed');
  });
}

test('password registration stores an unverified customer account', async () => {
  let sql = '';
  let parameters: unknown[] = [];
  const client = { query: async (statement: string, values: unknown[]) => {
    sql = statement; parameters = values;
    return { rows: [{ role: 'customer', email_verified: false }] };
  } } as unknown as PoolClient;
  const result = await createUser(client, 'Traveler', ' TEST@example.com ', Buffer.from('hash'), null);
  assert.match(sql, /'customer', FALSE/);
  assert.equal(parameters[1], 'test@example.com');
  assert.equal(result.rows[0].email_verified, false);
});

test('Google rejects unverified provider emails before accessing the database', async () => {
  configurePassport(config);
  const strategy = (passport as unknown as { _strategy(name: string): { _verify: Function } })._strategy('google');
  await new Promise<void>((resolve, reject) => {
    strategy._verify('unused', 'unused', { id: '42', emails: [{ value: 'test@example.com' }], _json: { email_verified: false } }, (error: Error) => {
      try { assert.match(error.message, /Google email is not verified/); resolve(); } catch (failure) { reject(failure); }
    });
  });
  passport.unuse('google');
  passport.unuse('facebook');
});
import { initializeDatabase, closeDatabase } from '../src/config/database.js';
import { registerController as simpleRegister } from '../src/controllers/auth-simple.controller.js';

test('simple registration ignores a supplied administrator role', async (context) => {
  const pool = initializeDatabase(config);
  context.after(closeDatabase);
  let insertedRole: unknown;
  context.mock.method(pool, 'query', async (sql: string, values: unknown[]) => {
    if (sql.startsWith('SELECT')) return { rows: [] };
    insertedRole = values[3];
    return { rows: [{ fullname: 'Traveler', role: insertedRole, password: values[2] }] };
  });
  let status: number | undefined;
  let body: any;
  const response = { status(code: number) { status = code; return this; }, json(value: unknown) { body = value; return this; } };
  await simpleRegister({ body: { fullname: 'Traveler', email: 'test@example.com', password: 'Example-pass-123', role: 'admin' } } as express.Request,
    response as unknown as express.Response, error => { if (error) throw error; });
  assert.equal(status, 201);
  assert.equal(insertedRole, 'customer');
  assert.equal(body.user.role, 'customer');
  assert.equal('password' in body.user, false);
});
