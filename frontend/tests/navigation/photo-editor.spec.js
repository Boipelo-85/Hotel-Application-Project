import { expect, test } from '@playwright/test';

const originalPhoto = { id: '10', image_url: '/uploads/original.png', alt_text: 'Original photo', display_order: 0 };
const newPhoto = { id: '11', image_url: '/uploads/replacement.png', alt_text: 'Replacement photo', display_order: 1 };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=', 'base64');

for (const kind of ['Branch', 'Room']) {
  test(`${kind} editor saves details independently and can replace a photo`, async ({ page }) => {
    const branch = { id: '1', name: 'Test branch', city: 'Pretoria', province: 'Gauteng', address: 'Test Street',
      latitude: -25.7, longitude: 28.2, currency: 'ZAR', price_per_night: '1000', images: [originalPhoto] };
    const room = { id: '2', branch_id: '1', room_type: 'Standard Single', capacity: 1, quantity: 1,
      price: '1000', currency: 'ZAR', images: [originalPhoto] };
    const photoPath = kind === 'Branch' ? '/admin/branches/1' : '/admin/rooms/2';
    const savePath = kind === 'Branch' ? '/branches/1' : photoPath;
    const photoWrites = [];
    let detailSaves = 0;

    await page.route('**/uploads/*.png', route => route.fulfill({ contentType: 'image/png', body: png }));
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api/v1', '');
      if (path === '/auth/me') return route.fulfill({ json: { user: { id: '5', name: 'Admin', role: 'admin' } } });
      if (path === '/branches/managed') return route.fulfill({ json: { branches: [branch] } });
      if (path === '/branches/1/rooms') return route.fulfill({ json: { rooms: [room] } });
      if (path === '/rooms/2') return route.fulfill({ json: { room } });
      if (path === savePath && request.method() === 'PATCH') {
        detailSaves++;
        return route.fulfill({ json: { branch, room } });
      }
      if (path === `${photoPath}/upload-image` && request.method() === 'POST') {
        expect(request.headers()['content-type']).toContain('multipart/form-data');
        expect(request.postData()).toContain('replacement.png');
        photoWrites.push('add');
        return route.fulfill({ status: 201, json: { image: newPhoto } });
      }
      if (path === `${photoPath}/images/10` && request.method() === 'DELETE') {
        photoWrites.push('remove');
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: { notifications: [] } });
    });

    await page.goto(kind === 'Branch' ? '/admin/hotels/1/edit' : '/admin/rooms?branchId=1');
    if (kind === 'Room') await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const photos = page.getByRole('group', { name: `${kind} photos` });
    await expect(photos.getByAltText('Original photo')).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(() => detailSaves).toBe(1);
    expect(photoWrites).toEqual([]);

    if (kind === 'Room') await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await photos.getByLabel('Choose a photo').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: png });
    await photos.getByRole('button', { name: 'Add photo' }).click();
    await expect(photos.getByAltText('Replacement photo')).toBeVisible();
    await photos.getByRole('button', { name: 'Remove photo 1' }).click();
    await expect(photos.getByAltText('Original photo')).toHaveCount(0);
    await expect(photos.getByAltText('Replacement photo')).toBeVisible();
    expect(photoWrites).toEqual(['add', 'remove']);
  });
}
