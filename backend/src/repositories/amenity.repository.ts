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

export async function replaceBranchAmenities(
  client: PoolClient,
  branchId: string,
  amenityIds: string[],
) {
  await client.query('DELETE FROM branch_amenities WHERE branch_id = $1', [branchId]);
  const result = await client.query(
    `INSERT INTO branch_amenities (branch_id, amenity_id)
     SELECT $1, unnest($2::BIGINT[])`,
    [branchId, amenityIds],
  );
  return result.rowCount ?? 0;
}
