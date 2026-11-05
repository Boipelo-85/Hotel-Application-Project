import { test, expect } from '@playwright/test';

test('guest can reserve, pay, return from checkout and request cancellation without signing in', async ({ page }) => {
  const booking = { id: '7', user_id: null, booking_reference: 'HB-GUEST-TEST', guest_email: 'guest@example.test',
    room_id: '1', check_in: '2099-01-01', check_out: '2099-01-03', guests: 2, quantity: 1,
    total_amount: '2400.00', currency: 'ZAR', status: 'pending', expires_at: new Date(Date.now() + 900000).toISOString(),
    branch_name: 'Test branch', room_type: 'Standard Queen' };
  let checkouts = 0;
  let cancellations = 0;
  await page.route('https://checkout.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Hosted payment</h1>' }));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me' || path === '/auth/refresh') return route.fulfill({ status: 401, json: { message: 'Sign in required' } });
    if (path === '/rooms/1') return route.fulfill({ json: { room: { id: '1', room_type: 'Standard Queen', price: '1200.00', currency: 'ZAR', capacity: 2, quantity: 5 } } });
    if (path === '/bookings' && request.method() === 'POST') {
      expect(request.postDataJSON().guestEmail).toBe('guest@example.test');
      return route.fulfill({ status: 201, json: { booking } });
    }
    if (path === '/guest-bookings/7/checkout') {
      expect(request.postDataJSON()).toEqual({ paymentMethod: 'eft' });
      expect(request.headers()['idempotency-key']).toBeTruthy();
      checkouts++;
      return route.fulfill({ json: { checkoutUrl: 'https://checkout.example.test/pay' } });
    }
    if (path === '/guest-bookings/7/verify') {
      expect(request.postDataJSON()).toEqual({ reference: 'guest-reference' });
      booking.status = 'confirmed';
      return route.fulfill({ json: { status: 'successful', bookingStatus: 'confirmed', bookingId: '7' } });
    }
    if (path === '/guest-bookings/7/cancel') {
      cancellations++; booking.refund_pending = true;
      return route.fulfill({ status: 202, json: { status: 'refund_requested' } });
    }
    if (path === '/guest-bookings/7') return route.fulfill({ json: { booking } });
    if (request.method() !== 'GET') throw new Error('Unexpected write: ' + path);
    return route.fulfill({ json: { notifications: [], branches: [] } });
  });
  await page.goto('/book?roomId=1&checkIn=2099-01-01&checkOut=2099-01-03');
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.getByLabel('First name').fill('Guest');
  await page.getByLabel('Last name').fill('Traveler');
  await page.getByLabel('Email address', { exact: true }).fill('guest@example.test');
  await page.getByLabel('Phone number').fill('0712345678');
  await page.getByLabel('Country / region').fill('South Africa');
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street');
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await expect(page).toHaveURL(/\/guest-bookings\/7$/);
  await page.getByLabel('Payment method').selectOption('eft');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue to secure payment' }).click();
  await expect(page.getByRole('heading', { name: 'Hosted payment' })).toBeVisible();
  expect(checkouts).toBe(1);
  await page.goto('/payment/callback?guestBookingId=7&reference=guest-reference');
  await expect(page.getByText('Payment received. Your booking is confirmed.')).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel and request refund' }).click();
  await expect(page.getByText('Cancellation requested. Your booking will be cancelled when the provider confirms the refund.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel and request refund' })).toHaveCount(0);
  expect(cancellations).toBe(1);
});
