import { query } from '../config/database.js';

export async function listUserFavourites(userId: string) {
  return query(
    `SELECT h.*, brand.name AS brand_name,
       f.created_at AS favourited_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM branch_images i WHERE i.branch_id = h.id), '[]'::JSONB) AS images
     FROM favourites f
     JOIN branches h ON h.id = f.branch_id
     JOIN hotel_brand brand ON brand.id = h.brand_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );
}

export async function addFavourite(userId: string, branchId: string) {
  return query(
    `INSERT INTO favourites (user_id, branch_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, branch_id) DO NOTHING
     RETURNING id, user_id, branch_id, created_at`,
    [userId, branchId],
  );
}

export async function findBranchById(branchId: string) {
  return query<{ id: string; publication_status: string }>(
    'SELECT id, publication_status FROM branches WHERE id = $1',
    [branchId],
  );
}

export async function getFavourite(userId: string, branchId: string) {
  return query(
    `SELECT f.id, f.user_id, f.branch_id, f.created_at, h.publication_status
     FROM favourites f JOIN branches h ON h.id = f.branch_id
     WHERE f.user_id = $1 AND f.branch_id = $2`,
    [userId, branchId],
  );
}

export async function removeFavouriteById(favouriteId: string) {
  return query('DELETE FROM favourites WHERE id = $1', [favouriteId]);
}
