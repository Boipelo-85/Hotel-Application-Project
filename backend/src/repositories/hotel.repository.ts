import type { PoolClient } from 'pg';
import { query } from '../config/database.js';
import type { AuthenticatedUser } from '../types/models.js';
import type { HotelInput } from '../types/models.js';

export async function listHotels(search: string | null) {
  return query(
    `SELECT h.id, h.name, h.address, h.star_rating, h.description, h.policies,
       h.price_per_night, h.currency, h.contact_email, h.contact_phone,
       h.latitude, h.longitude, h.created_at, h.updated_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM hotel_images i WHERE i.hotel_id = h.id), '[]'::JSONB) AS images,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'category', a.category)
       ORDER BY a.name) FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id
       WHERE ha.hotel_id = h.id), '[]'::JSONB) AS amenities,
       (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.hotel_id = h.id AND rv.deleted_at IS NULL) AS average_rating
     FROM hotels h
     WHERE h.publication_status = 'published'
       AND ($1::TEXT IS NULL OR h.name ILIKE '%' || $1 || '%' OR h.address ILIKE '%' || $1 || '%')
     ORDER BY h.name LIMIT 100`,
    [search],
  );
}

export async function listManagedHotels(user: Pick<AuthenticatedUser, 'id' | 'role'>) {
  return query(
    `SELECT h.* FROM hotels h
     WHERE ($1 = 'admin' OR h.partner_user_id = $2)
     ORDER BY h.updated_at DESC LIMIT 500`,
    [user.role, user.id],
  );
}

export async function findHotel(hotelId: string, includeUnpublished: boolean) {
  return query(
    `SELECT h.id, h.name, h.address, h.star_rating, h.description, h.policies,
       h.price_per_night, h.currency, h.contact_email, h.contact_phone,
       h.latitude, h.longitude, h.created_at, h.updated_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', i.id, 'url', i.image_url, 'altText', i.alt_text, 'displayOrder', i.display_order
       ) ORDER BY i.display_order) FROM hotel_images i WHERE i.hotel_id = h.id), '[]'::JSONB) AS images,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'category', a.category)
       ORDER BY a.name) FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id
       WHERE ha.hotel_id = h.id), '[]'::JSONB) AS amenities,
       (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.hotel_id = h.id AND rv.deleted_at IS NULL) AS average_rating
     FROM hotels h
     WHERE h.id = $1 AND ($2::BOOLEAN OR h.publication_status = 'published')`,
    [hotelId, includeUnpublished],
  );
}

export async function findHotelOwner(hotelId: string, client?: PoolClient, lock = false) {
  if (client) {
    return client.query<{ partner_user_id: string | null }>(
      `SELECT partner_user_id FROM hotels WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`,
      [hotelId],
    );
  }
  return query<{ partner_user_id: string | null }>(
    'SELECT partner_user_id FROM hotels WHERE id = $1',
    [hotelId],
  );
}

export async function insertHotel(
  input: Required<Pick<HotelInput, 'name' | 'address' | 'pricePerNight'>> & HotelInput,
  partnerId: string | null,
  publicationStatus: 'published' | 'pending_review',
) {
  return query(
    `INSERT INTO hotels (
       partner_user_id, name, address, description, star_rating, price_per_night,
       policies, currency, contact_email, contact_phone, latitude, longitude, publication_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      partnerId, input.name, input.address, input.description, input.starRating,
      input.pricePerNight, JSON.stringify(input.policies), input.currency,
      input.contactEmail, input.contactPhone, input.latitude, input.longitude,
      publicationStatus,
    ],
  );
}

export async function updateHotelRecord(
  client: PoolClient,
  hotelId: string,
  userRole: AuthenticatedUser['role'],
  input: HotelInput,
) {
  return client.query(
    `UPDATE hotels SET
       name = COALESCE($2, name),
       address = COALESCE($3, address),
       description = CASE WHEN $4::BOOLEAN THEN $5 ELSE description END,
       star_rating = CASE WHEN $6::BOOLEAN THEN $7 ELSE star_rating END,
       policies = CASE WHEN $8::BOOLEAN THEN $9::JSONB ELSE policies END,
       price_per_night = COALESCE($10, price_per_night),
       currency = COALESCE($11, currency),
       contact_email = CASE WHEN $12::BOOLEAN THEN $13 ELSE contact_email END,
       contact_phone = CASE WHEN $14::BOOLEAN THEN $15 ELSE contact_phone END,
       latitude = CASE WHEN $16::BOOLEAN THEN $17 ELSE latitude END,
       longitude = CASE WHEN $18::BOOLEAN THEN $19 ELSE longitude END,
       publication_status = CASE WHEN $20 = 'admin' THEN publication_status ELSE 'pending_review' END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [
      hotelId, input.name ?? null, input.address ?? null,
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

export async function saveHotelPublicationStatus(
  hotelId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected',
  client?: PoolClient,
) {
  const execute = client ? client.query.bind(client) : query;
  return execute(
    `UPDATE hotels SET publication_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [hotelId, status],
  );
}
