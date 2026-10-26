import type { PoolClient } from 'pg';

export async function insertBranchImage(
  client: PoolClient,
  branchId: string,
  input: { imageUrl: string; altText: string | null; displayOrder: number },
) {
  return client.query(
    `INSERT INTO branch_images (branch_id, image_url, alt_text, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [branchId, input.imageUrl, input.altText, input.displayOrder],
  );
}

export async function removeBranchImage(client: PoolClient, branchId: string, imageId: string) {
  return client.query('DELETE FROM branch_images WHERE id = $1 AND branch_id = $2', [imageId, branchId]);
}
