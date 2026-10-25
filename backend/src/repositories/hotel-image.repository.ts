import type { PoolClient } from 'pg';

export async function insertHotelImage(
  client: PoolClient,
  hotelId: string,
  input: { imageUrl: string; altText: string | null; displayOrder: number },
) {
  return client.query(
    `INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [hotelId, input.imageUrl, input.altText, input.displayOrder],
  );
}

export async function removeHotelImage(client: PoolClient, hotelId: string, imageId: string) {
  return client.query('DELETE FROM hotel_images WHERE id = $1 AND hotel_id = $2', [imageId, hotelId]);
}
