import type { PoolClient } from 'pg';
import { query } from '../config/database.js';
import type { AuthenticatedUser } from '../types/models.js';
import type { BranchInput } from '../types/models.js';

export async function listBranches(search: string | null, city: string | null = null) {
  return query(
    `SELECT h.id, h.brand_id, h.name, h.city, h.province, h.address, h.star_rating, h.description, h.policies,
       h.price_per_night, h.currency, h.contact_email, h.contact_phone,
       h.latitude, h.longitude, h.created_at, h.updated_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM branch_images i WHERE i.branch_id = h.id), '[]'::JSONB) AS images,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'category', a.category)
       ORDER BY a.name) FROM branch_amenities ha JOIN amenities a ON a.id = ha.amenity_id
       WHERE ha.branch_id = h.id), '[]'::JSONB) AS amenities,
       (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.branch_id = h.id AND rv.deleted_at IS NULL) AS average_rating,
       brand.name AS brand_name
     FROM branches h
     JOIN hotel_brand brand ON brand.id = h.brand_id
     WHERE h.publication_status = 'published'
       AND ($1::TEXT IS NULL OR h.name ILIKE '%' || $1 || '%' OR h.address ILIKE '%' || $1 || '%')
       AND ($2::TEXT IS NULL OR h.city ILIKE '%' || $2 || '%')
     ORDER BY h.name LIMIT 100`,
    [search, city],
  );
}

export async function searchAvailableBranches(input: {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
}) {
  return query(
    `WITH available_rooms AS (
       SELECT r.id, r.branch_id, r.room_type, r.description, r.capacity, r.price, r.currency,
              GREATEST(
                r.quantity - COALESCE((
                  SELECT SUM(bk.quantity)::INTEGER
                  FROM bookings bk
                  WHERE bk.room_id = r.id
                    AND bk.check_in < $3::DATE
                    AND bk.check_out > $2::DATE
                    AND (
                      bk.status = 'confirmed'
                      OR (bk.status = 'pending' AND bk.expires_at > CURRENT_TIMESTAMP)
                    )
                ), 0),
                0
              )::INTEGER AS available_quantity
       FROM rooms r
       JOIN branches br ON br.id = r.branch_id
       WHERE r.status = 'active'
         AND r.availability = TRUE
         AND br.publication_status = 'published'
         AND (
           br.city ILIKE '%' || $1 || '%'
           OR br.province ILIKE '%' || $1 || '%'
         )
     )
     SELECT jsonb_build_object(
              'id', br.id::TEXT,
              'brandId', br.brand_id::TEXT,
              'brandName', brand.name,
              'name', br.name,
              'city', br.city,
              'province', br.province,
              'address', br.address,
              'starRating', br.star_rating,
              'description', br.description,
              'policies', br.policies,
              'pricePerNight', br.price_per_night,
              'currency', br.currency,
              'contactEmail', br.contact_email,
              'contactPhone', br.contact_phone,
              'latitude', br.latitude,
              'longitude', br.longitude
            ) AS branch,
            rr.room_type AS "roomType",
            rr.price,
            rr.currency,
            rr.available_quantity AS "availableRooms",
            rr.capacity
     FROM available_rooms rr
     JOIN branches br ON br.id = rr.branch_id
     JOIN hotel_brand brand ON brand.id = br.brand_id
     WHERE rr.available_quantity >= $4
       AND rr.capacity * $4 >= $5
     ORDER BY br.city, br.name, rr.price, rr.room_type`,
    [input.destination, input.checkIn, input.checkOut, input.rooms, input.guests],
  );
}

export async function listManagedBranches(user: Pick<AuthenticatedUser, 'id' | 'role'>) {
  return query(
    `SELECT h.*, brand.name AS brand_name FROM branches h
    JOIN hotel_brand brand ON brand.id = h.brand_id
     WHERE ($1 = 'admin' OR h.manager_user_id = $2)
     ORDER BY h.updated_at DESC LIMIT 500`,
    [user.role, user.id],
  );
}

export async function findBranch(branchId: string, includeUnpublished: boolean) {
  return query(
    `SELECT h.id, h.brand_id, h.name, h.city, h.province, h.address, h.star_rating, h.description, h.policies,
       h.price_per_night, h.currency, h.contact_email, h.contact_phone,
       h.latitude, h.longitude, h.created_at, h.updated_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM branch_images i WHERE i.branch_id = h.id), '[]'::JSONB) AS images,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'category', a.category)
       ORDER BY a.name) FROM branch_amenities ha JOIN amenities a ON a.id = ha.amenity_id
       WHERE ha.branch_id = h.id), '[]'::JSONB) AS amenities,
       (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.branch_id = h.id AND rv.deleted_at IS NULL) AS average_rating,
       brand.name AS brand_name
     FROM branches h
     JOIN hotel_brand brand ON brand.id = h.brand_id
     WHERE h.id = $1 AND ($2::BOOLEAN OR h.publication_status = 'published')`,
    [branchId, includeUnpublished],
  );
}

export async function findBranchManager(branchId: string, client?: PoolClient, lock = false) {
  const sql = `SELECT h.manager_user_id
               FROM branches h
               WHERE h.id = $1 ${lock ? 'FOR UPDATE OF h' : ''}`;
  if (client) {
    return client.query<{ manager_user_id: string | null }>(sql, [branchId]);
  }
  return query<{ manager_user_id: string | null }>(sql, [branchId]);
}

export async function findBranchManagerUser(userId: string, client?: PoolClient) {
  const sql = `SELECT id FROM users WHERE id = $1 AND role = 'branch_manager'`;
  if (client) return client.query<{ id: string }>(sql, [userId]);
  return query<{ id: string }>(sql, [userId]);
}

export async function insertBranch(
  client: PoolClient,
  input: Required<Pick<BranchInput, 'name' | 'city' | 'province' | 'address' | 'pricePerNight'>> & BranchInput,
  managerId: string | null,
  publicationStatus: 'published' | 'pending_review',
) {
  return client.query(
    `INSERT INTO branches (
       manager_user_id, name, city, province, address, description, star_rating, price_per_night,
       policies, currency, contact_email, contact_phone, latitude, longitude, publication_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      managerId, input.name, input.city, input.province, input.address, input.description, input.starRating,
      input.pricePerNight, JSON.stringify(input.policies), input.currency,
      input.contactEmail, input.contactPhone, input.latitude, input.longitude,
      publicationStatus,
    ],
  );
}

export async function updateBranchManager(
  client: PoolClient,
  branchId: string,
  managerUserId: string | null,
) {
  return client.query(
    `UPDATE branches
     SET manager_user_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [branchId, managerUserId],
  );
}

export async function updateBranchRecord(
  client: PoolClient,
  branchId: string,
  userRole: AuthenticatedUser['role'],
  input: BranchInput,
) {
  return client.query(
    `UPDATE branches SET
       name = COALESCE($2, name),
       address = COALESCE($3, address),
       city = COALESCE($4, city),
       province = COALESCE($5, province),
       description = CASE WHEN $6::BOOLEAN THEN $7 ELSE description END,
       star_rating = CASE WHEN $8::BOOLEAN THEN $9 ELSE star_rating END,
       policies = CASE WHEN $10::BOOLEAN THEN $11::JSONB ELSE policies END,
       price_per_night = COALESCE($12, price_per_night),
       currency = COALESCE($13, currency),
       contact_email = CASE WHEN $14::BOOLEAN THEN $15 ELSE contact_email END,
       contact_phone = CASE WHEN $16::BOOLEAN THEN $17 ELSE contact_phone END,
       latitude = CASE WHEN $18::BOOLEAN THEN $19 ELSE latitude END,
       longitude = CASE WHEN $20::BOOLEAN THEN $21 ELSE longitude END,
       publication_status = CASE WHEN $22 = 'admin' THEN publication_status ELSE 'pending_review' END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [
      branchId, input.name ?? null, input.address ?? null, input.city ?? null, input.province ?? null,
      input.description !== undefined, input.description ?? null,
      input.starRating !== undefined, input.starRating ?? null,
      input.policies !== undefined, JSON.stringify(input.policies ?? {}),
      input.pricePerNight ?? null, input.currency ?? null,
      input.contactEmail !== undefined, input.contactEmail ?? null,
      input.contactPhone !== undefined, input.contactPhone ?? null,
      input.latitude !== undefined, input.latitude ?? null,
      input.longitude !== undefined, input.longitude ?? null, userRole,
    ],
  );
}

export async function saveBranchPublicationStatus(
  branchId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected',
  client?: PoolClient,
) {
  const execute = client ? client.query.bind(client) : query;
  return execute(
    `UPDATE branches SET publication_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [branchId, status],
  );
}
