import type { PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function insertBranchImage(
  client: PoolClient,
  branchId: string,
  input: { imageUrl: string; altText: string | null; displayOrder: number },
) {
  await client.query('UPDATE branch_images SET display_order = display_order + 1 WHERE branch_id = $1 AND display_order >= $2', [branchId, input.displayOrder]);
  return client.query(
    `INSERT INTO branch_images (branch_id, image_url, alt_text, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [branchId, input.imageUrl, input.altText, input.displayOrder],
  );
}

export async function removeBranchImage(client: PoolClient, branchId: string, imageId: string) {
  // First get the image URL to delete the file
  const result = await client.query(
    'SELECT image_url FROM branch_images WHERE id = $1 AND branch_id = $2',
    [imageId, branchId]
  );
  
  if (result.rows[0]) {
    const imageUrl = result.rows[0].image_url;
    // Delete the file from uploads folder
    if (imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../..', imageUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('Failed to delete image file:', error);
      }
    }
  }
  
  return client.query('DELETE FROM branch_images WHERE id = $1 AND branch_id = $2', [imageId, branchId]);
}
