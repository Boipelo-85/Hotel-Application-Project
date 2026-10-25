import type { PoolClient } from 'pg';
import { query } from '../config/database.js';

export async function listAmenities() {
  return query('SELECT id, name, category FROM amenities ORDER BY name');
}

export async function createAmenity(name: string, category: string | null) {
  return query(
    'INSERT INTO amenities (name, category) VALUES ($1, $2) RETURNING id, name, category',
    [name, category],
  );
}

export async function replaceHotelAmenities(
  client: PoolClient,
  hotelId: string,
  amenityIds: string[],
) {
  await client.query('DELETE FROM hotel_amenities WHERE hotel_id = $1', [hotelId]);
  const result = await client.query(
    `INSERT INTO hotel_amenities (hotel_id, amenity_id)
     SELECT $1, unnest($2::BIGINT[])`,
    [hotelId, amenityIds],
  );
  return result.rowCount ?? 0;
}
