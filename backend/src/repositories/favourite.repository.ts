import { query } from '../config/database.js';

const favouriteSelect = `
  SELECT f.id, f.user_id, f.branch_id, f.created_at, h.publication_status,
         jsonb_build_object(
           'id', h.id::TEXT,
           'name', h.name,
           'city', h.city,
           'province', h.province,
           'address', h.address,
           'star_rating', h.star_rating,
           'price_per_night', h.price_per_night,
           'currency', h.currency,
           'image_url', (
             SELECT i.image_url
             FROM branch_images i
             WHERE i.branch_id = h.id
             ORDER BY i.display_order, i.id
             LIMIT 1
           )
         ) AS branch
  FROM favourites f
  JOIN branches h ON h.id = f.branch_id
`;

export async function listUserFavourites(userId: string) {
  return query<{
    id: string;
    user_id: string;
    branch_id: string;
    created_at: Date;
    publication_status: string;
    branch: {
      id: string;
      name: string;
      city: string;
      province: string;
      address: string;
      star_rating: number | null;
      price_per_night: string;
      currency: string;
      image_url: string | null;
    };
  }>(
    `${favouriteSelect}
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
  return query<{
    id: string;
    user_id: string;
    branch_id: string;
    created_at: Date;
    publication_status: string;
    branch: {
      id: string;
      name: string;
      city: string;
      province: string;
      address: string;
      star_rating: number | null;
      price_per_night: string;
      currency: string;
      image_url: string | null;
    };
  }>(
    `${favouriteSelect}
     WHERE f.user_id = $1 AND f.branch_id = $2`,
    [userId, branchId],
  );
}

export async function removeFavouriteById(favouriteId: string) {
  return query('DELETE FROM favourites WHERE id = $1', [favouriteId]);
}
