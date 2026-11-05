import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const branch = { id: '1', name: 'Grand-Rest Pretoria', city: 'Pretoria', province: 'Gauteng', address: '1 Test Street',
  star_rating: 4, price_per_night: '1200.00', currency: 'ZAR', images: [], amenities: [], policies: {}, publication_status: 'published' };
const branches = [branch, { ...branch, id: '2', name: 'Grand-Rest Johannesburg' }];
const room = { id: '1', branch_id: '1', room_type: 'Standard Queen', capacity: 2, quantity: 5, quantity_available: 5,
  price: '1200.00', currency: 'ZAR', images: [], amenities: [], is_available: true, can_accommodate_guests: true };
const booking = { id: '1', booking_reference: 'HB-TEST-001', room_id: '1', check_in: '2027-01-12', check_out: '2027-01-14',
  guests: 2, quantity: 1, total_amount: '2400.00', currency: 'ZAR', status: 'pending', branch_name: branch.name, room_type: room.room_type };

async function mockApi(page, { role = 'customer', expired = false, confirmed = false, loginRole = 'customer' } = {}) {
  const user = { id: '2', name: 'Test Traveler', email: 'traveler@example.test', role, email_verified: true };
  const errors = [];
  let refreshed = false;
  let signedInRole = role;
  page.on('pageerror', error => errors.push(error.message));
  // Third-party images and map tiles are outside these navigation checks.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173\/)/, route => route.abort());
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      await new Promise(resolve => setTimeout(resolve, 120));
      return route.fulfill({ status: signedInRole === 'guest' || (expired && !refreshed) ? 401 : 200, json: { user: { ...user, role: signedInRole } } });
    }
    if (path === '/auth/refresh') { refreshed = true; return route.fulfill({ status: signedInRole === 'guest' ? 401 : 200, json: { user } }); }
    if (path === '/auth/login') { signedInRole = loginRole; return route.fulfill({ json: { user: { ...user, role: loginRole } } }); }
    if (path === '/auth/logout') { signedInRole = 'guest'; return route.fulfill({ status: 204 }); }
    if (request.method() !== 'GET') throw new Error('Unexpected write in navigation test: ' + path);
    const savedBooking = { ...booking, status: confirmed ? 'confirmed' : 'pending' };
    let json = {};
    if (path === '/branches' || path === '/branches/managed') json = { branches };
    else if (/^\/branches\/\d+$/.test(path)) json = { branch: branches.find(b => b.id === path.split('/')[2]) || branch };
    else if (path.endsWith('/reviews')) json = { reviews: [] };
    else if (path.endsWith('/rooms') || path === '/rooms') json = { rooms: [room] };
    else if (path === '/rooms/1') json = { room };
    else if (path === '/bookings/1') json = { booking: savedBooking };
    else if (path.endsWith('/bookings') || path.includes('recent-bookings')) json = { bookings: [savedBooking] };
    else if (path === '/favourites') json = { favourites: [] };
    else if (path === '/notifications') json = { notifications: [] };
    else if (path === '/users/profile') json = { user };
    else if (path.endsWith('/stats')) json = { stats: { total_users: 1, total_branches: 2, total_rooms: 5, active_bookings: 1, pending_bookings: 1, monthly_revenue: '2400.00' } };
    else if (path.startsWith('/payments/verify/')) json = { status: 'successful', bookingId: '1', bookingStatus: 'confirmed' };
    else if (path === '/search') json = [{ branch, roomType: room.room_type, price: '1200.00', currency: 'ZAR', availableRooms: 5, capacity: 2 }];
    await route.fulfill({ json });
  });
  return errors;
}
const pages = [
  ['/', 'Welcome to Grand-Rest Hotel'], ['/hotels', 'Our Branches'], ['/hotels/1', branch.name], ['/branches/1', branch.name],
  ['/book?roomId=1&checkIn=2027-01-12&checkOut=2027-01-14', 'Complete your booking'], ['/booking-lookup', 'Find a guest booking'],
  ['/bookings', 'My Bookings'], ['/bookings/1', 'Booking details'], ['/bookings/1/payment', 'Payment'],
  ['/bookings/1/payment/review?method=eft', 'Review your booking'], ['/profile', 'My profile'], ['/favourites', 'Favourites'],
  ['/notifications', 'Notifications'], ['/unknown-page', '404'],
  ['/admin', 'Staff dashboard', 'admin'], ['/admin/hotels', 'Manage branches', 'admin'],
  ['/admin/hotels/new', 'Add branch', 'admin'], ['/admin/hotels/1/edit', 'Edit branch', 'admin'],
  ['/admin/rooms?branchId=1', 'Manage rooms', 'admin'], ['/admin/bookings?branchId=1&status=pending', 'Manage bookings', 'admin'],
  ['/login', 'Sign in to your account', 'guest'], ['/register', 'Create your account', 'guest'], ['/admin/login', 'Sign in to your account', 'guest'],
];
for (const [path, heading, role] of pages) test('direct entry and refresh: ' + path, async ({ page }) => {
  const errors = await mockApi(page, { role });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path === '/admin/login' ? '/login' : path.split('?')[0]);
  expect(errors).toEqual([]);
});

test('expired access session refreshes before protected navigation', async ({ page }) => {
  await mockApi(page, { expired: true });
  await page.goto('/bookings/1?view=receipt', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Booking details' })).toBeVisible();
  await expect(page).toHaveURL(/\/bookings\/1\?view=receipt$/);
});
for (const admin of [false, true]) test('login returns to the requested ' + (admin ? 'staff' : 'customer') + ' page', async ({ page }) => {
  await mockApi(page, { role: 'guest', loginRole: admin ? 'admin' : 'customer' });
  const path = admin ? '/admin/rooms?branchId=2' : '/bookings/1/payment?method=eft';
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel(/email/i).fill('test@example.test');
  await page.getByLabel(/password/i).fill('Example-password-123');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173' + (admin ? '/admin' : path));
});

test('payment method survives review, refresh, back and forward', async ({ page }) => {
  await mockApi(page);
  await page.goto('/bookings/1/payment', { waitUntil: 'domcontentloaded' });
  await page.getByRole('radio', { name: 'Instant EFT / bank payment' }).check();
  await page.getByRole('button', { name: 'Review booking' }).click();
  await expect(page).toHaveURL(/review\?method=eft$/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Payment method: Instant EFT / bank payment')).toBeVisible();
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('radio', { name: 'Instant EFT / bank payment' })).toBeChecked();
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Review your booking' })).toBeVisible();
  await page.getByRole('link', { name: 'Change payment method' }).click();
  await expect(page.getByRole('radio', { name: 'Instant EFT / bank payment' })).toBeChecked();
});

test('paid receipt, back/forward, callback and checkout recovery', async ({ page }) => {
  const errors = await mockApi(page, { confirmed: true });
  await page.goto('/bookings/1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Booking confirmed!' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('HB-TEST-001')).toBeVisible();
  await page.getByRole('link', { name: 'View my bookings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Bookings', exact: true })).toBeVisible();
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Booking confirmed!' })).toBeVisible();
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/bookings$/);
  for (const path of ['/bookings/1/payment', '/bookings/1/payment/review', '/payment/callback?reference=test']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Booking confirmed!' })).toBeVisible();
    await expect(page).toHaveURL(/\/bookings\/1$/);
  }
  expect(errors).toEqual([]);
});

test('missing booking state and payment reference show recovery links', async ({ page }) => {
  await mockApi(page);
  await page.goto('/booking-confirmation', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Booking details are not available in this session.')).toBeVisible();
  await page.getByRole('link', { name: 'Browse branches' }).click();
  await expect(page).toHaveURL(/\/hotels$/);
  await page.goto('/payment/callback', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('No payment reference was found in this link.')).toBeVisible();
});

test('admin filters follow back, forward and refresh', async ({ page }) => {
  await mockApi(page, { role: 'admin' });
  await page.goto('/admin/bookings?branchId=1&status=pending', { waitUntil: 'domcontentloaded' });
  await page.getByRole('combobox', { name: 'Branch', exact: true }).selectOption('2');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('confirmed');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('pending');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Branch', exact: true })).toHaveValue('1');
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Branch', exact: true })).toHaveValue('2');
  await page.goto('/admin/rooms?branchId=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('combobox', { name: 'Branch', exact: true }).selectOption('2');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Branch', exact: true })).toHaveValue('1');
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Branch', exact: true })).toHaveValue('2');
});

test('search fields follow history and Back to results keeps the search', async ({ page }) => {
  await mockApi(page);
  await page.goto('/hotels?destination=Pretoria&checkIn=2027-01-12&checkOut=2027-01-14', { waitUntil: 'domcontentloaded' });
  await page.locator('.input_destin').fill('Johannesburg');
  await page.locator('form.search-bar').evaluate(form => form.requestSubmit());
  await expect(page).toHaveURL(/destination=Johannesburg/);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.input_destin')).toHaveValue('Pretoria');
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.input_destin')).toHaveValue('Johannesburg');
  const results = page.url();
  await page.locator('.hotels-page__cards a').first().click();
  await expect(page.getByRole('link', { name: /Back to results/ })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Back to results/ }).click();
  await expect(page).toHaveURL(results);
});

test('Back to results returns featured accommodation to its originating page after refresh', async ({ page }) => {
  await mockApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.homes-guests-love__card-link').first().click();
  await expect(page).toHaveURL(/\/branches\/1$/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const back = page.getByRole('link', { name: /Back to results/ });
  await expect(back).toHaveAttribute('href', '/');
  await back.click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: 'Welcome to Grand-Rest Hotel' })).toBeVisible();
});

test('Back to results has a working fallback for directly opened accommodation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/branches/1?returnTo=https://example.com', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Back to results/ }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/hotels');
  await expect(page.getByRole('heading', { name: 'Our Branches', exact: true })).toBeVisible();
});

test('OAuth callback restores its saved destination', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => sessionStorage.setItem('auth:returnTo', '/bookings/1'));
  await page.goto('/auth/callback?login=success', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/bookings\/1$/);
  await expect(page.getByRole('heading', { name: 'Booking details' })).toBeVisible();
});

test('Vercel fallback covers every page and excludes API and uploads', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const rule = config.rewrites.find(rule => rule.destination === '/index.html');
  const pattern = new RegExp('^' + rule.source + '$');
  for (const [path] of pages) expect(pattern.test(path.split('?')[0])).toBe(true);
  expect(pattern.test('/api/v1/auth/me')).toBe(false);
  expect(pattern.test('/uploads/rooms/image.jpg')).toBe(false);
});

for (const role of ['admin', 'branch_manager']) {
  test('unified login redirects ' + role + ' to the dashboard', async ({ page }) => {
    await mockApi(page, { role: 'guest', loginRole: role });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill('staff@example.test');
    await page.getByLabel(/password/i).fill('Example-password-123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Staff dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
  test('already signed-in ' + role + ' opening login goes to the dashboard', async ({ page }) => {
    await mockApi(page, { role });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin$/);
  });
}

test('customer login goes home and cannot enter the admin site', async ({ page }) => {
  await mockApi(page, { role: 'guest' });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.getByLabel(/email/i).fill('traveler@example.test');
  await page.getByLabel(/password/i).fill('Example-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
});

test('wrong admin password uses the shared generic login error', async ({ page }) => {
  await mockApi(page, { role: 'guest' });
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: 401, json: { error: { message: 'Invalid email or password', code: 'INVALID_PASSWORD' } } }));
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill('admin@example.test');
  await page.getByLabel(/password/i).fill('Wrong-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Invalid email or password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

const mapTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
async function stubMapTiles(page) {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: mapTile }));
}

test('branch location map renders numeric-string coordinates and survives refresh', async ({ page }) => {
  test.setTimeout(60000);
  await mockApi(page);
  await stubMapTiles(page);
  await page.route('**/api/v1/branches/1', route => route.fulfill({ json: { branch: { ...branch, latitude: '-25.7479', longitude: '28.2293' } } }));
  await page.goto('/hotels/1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByAltText(branch.name + ' location', { exact: true })).toBeVisible();
  await expect(page.locator('.branch-location-map .leaflet-tile-loaded').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open map in OpenStreetMap' })).toHaveAttribute('href', /mlat=-25.7479&mlon=28.2293/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByAltText(branch.name + ' location', { exact: true })).toBeVisible();
});

test('add branch submits numeric coordinates and shows a preview', async ({ page }) => {
  await mockApi(page, { role: 'admin' });
  await stubMapTiles(page);
  let saved;
  await page.route('**/api/v1/admin/branches', async route => {
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { branch: { ...branch, ...saved } } });
  });
  await page.route('**/api/v1/admin/branches/1/upload-image', route => route.fulfill({ status: 201, json: {} }));
  await page.goto('/admin/hotels/new', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Name', { exact: true }).fill('Test branch');
  await page.getByLabel('City', { exact: true }).fill('Pretoria');
  await page.getByRole('combobox').selectOption('Gauteng');
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street');
  await page.locator('input[type=file]').setInputFiles({ name: 'branch.png', mimeType: 'image/png', buffer: mapTile });
  await page.getByLabel('Latitude', { exact: true }).fill('-25.7479');
  await page.getByLabel('Longitude', { exact: true }).fill('28.2293');
  await expect(page.getByAltText('Test branch location', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create branch', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/hotels$/);
  expect(saved.latitude).toBe(-25.7479);
  expect(saved.longitude).toBe(28.2293);
});

test('edit existing branch loads and saves coordinates including zero', async ({ page }) => {
  await mockApi(page, { role: 'admin' });
  await stubMapTiles(page);
  let saved;
  await page.route('**/api/v1/branches/managed', route => route.fulfill({ json: { branches: [{ ...branch, latitude: '-25.7479', longitude: '28.2293' }] } }));
  await page.route('**/api/v1/branches/1', async route => {
    saved = route.request().postDataJSON();
    await route.fulfill({ json: { branch: { ...branch, ...saved } } });
  });
  await page.goto('/admin/hotels/1/edit', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Latitude', { exact: true })).toHaveValue('-25.7479');
  await expect(page.getByLabel('Longitude', { exact: true })).toHaveValue('28.2293');
  await page.getByLabel('Latitude', { exact: true }).fill('0');
  await page.getByLabel('Longitude', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Branch updated.', { exact: true })).toBeVisible();
  expect(saved.latitude).toBe(0);
  expect(saved.longitude).toBe(0);
});

test('branch coordinate fields reject missing and out-of-range values', async ({ page }) => {
  await mockApi(page, { role: 'admin' });
  await page.goto('/admin/hotels/1/edit', { waitUntil: 'domcontentloaded' });
  const latitude = page.getByLabel('Latitude', { exact: true });
  const longitude = page.getByLabel('Longitude', { exact: true });
  await expect(latitude).toHaveValue('');
  expect(await latitude.evaluate(input => input.validity.valueMissing)).toBe(true);
  await latitude.fill('91'); await longitude.fill('181');
  expect(await latitude.evaluate(input => input.validity.rangeOverflow)).toBe(true);
  expect(await longitude.evaluate(input => input.validity.rangeOverflow)).toBe(true);
  await expect(page.locator('.branch-location-map')).toHaveCount(0);
});
