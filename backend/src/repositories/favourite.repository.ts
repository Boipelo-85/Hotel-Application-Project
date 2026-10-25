import { query } from '../config/database.js';

export async function listUserFavourites(userId: string) {
  return query(
    `SELECT h.*,
       f.created_at AS favourited_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM hotel_images i WHERE i.hotel_id = h.id), '[]'::JSONB) AS images
     FROM favourites f JOIN hotels h ON h.id = f.hotel_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );
}

export async function addFavourite(userId: string, hotelId: string) {
  return query(
    `INSERT INTO favourites (user_id, hotel_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, hotel_id) DO NOTHING
     RETURNING id, user_id, hotel_id, created_at`,
    [userId, hotelId],
  );
}

export async function findHotelById(hotelId: string) {
  return query<{ id: string; publication_status: string }>(
    'SELECT id, publication_status FROM hotels WHERE id = $1',
    [hotelId],
  );
}

export async function getFavourite(userId: string, hotelId: string) {
  return query(
    `SELECT f.id, f.user_id, f.hotel_id, f.created_at, h.publication_status
     FROM favourites f JOIN hotels h ON h.id = f.hotel_id
     WHERE f.user_id = $1 AND f.hotel_id = $2`,
    [userId, hotelId],
  );
}

export async function removeFavouriteById(favouriteId: string) {
  return query('DELETE FROM favourites WHERE id = $1', [favouriteId]);
}
