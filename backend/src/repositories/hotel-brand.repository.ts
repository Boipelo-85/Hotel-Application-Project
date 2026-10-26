import { query } from '../config/database.js';
export async function findHotelBrand() {
  return query(
    `SELECT id, name, description, logo_url, star_rating, contact_email, contact_phone,
            created_at, updated_at
     FROM hotel_brand
     WHERE id = 1`,
  );
}

export async function updateHotelBrand(input: {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  starRating?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}) {
  return query(
    `UPDATE hotel_brand SET
       name = COALESCE($1, name),
       description = CASE WHEN $2::BOOLEAN THEN $3 ELSE description END,
       logo_url = CASE WHEN $4::BOOLEAN THEN $5 ELSE logo_url END,
       star_rating = CASE WHEN $6::BOOLEAN THEN $7 ELSE star_rating END,
       contact_email = CASE WHEN $8::BOOLEAN THEN $9 ELSE contact_email END,
       contact_phone = CASE WHEN $10::BOOLEAN THEN $11 ELSE contact_phone END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = 1
     RETURNING id, name, description, logo_url, star_rating, contact_email, contact_phone,
               created_at, updated_at`,
    [
      input.name ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.logoUrl !== undefined,
      input.logoUrl ?? null,
      input.starRating !== undefined,
      input.starRating ?? null,
      input.contactEmail !== undefined,
      input.contactEmail ?? null,
      input.contactPhone !== undefined,
      input.contactPhone ?? null,
    ],
  );
}
