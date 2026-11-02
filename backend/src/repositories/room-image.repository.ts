import type { PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function insertRoomImage(
  client: PoolClient,
  roomId: string,
  input: { imageUrl: string; altText: string | null; displayOrder: number },
) {
  return client.query(
    `INSERT INTO room_images (room_id, image_url, alt_text, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [roomId, input.imageUrl, input.altText, input.displayOrder],
  );
}

export async function removeRoomImage(client: PoolClient, roomId: string, imageId: string) {
  // First get the image URL to delete the file
  const result = await client.query(
    'SELECT image_url FROM room_images WHERE id = $1 AND room_id = $2',
    [imageId, roomId]
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
  
  return client.query('DELETE FROM room_images WHERE id = $1 AND room_id = $2', [imageId, roomId]);
}

export async function listRoomImages(roomId: string) {
  const { query } = await import('../config/database.js');
  return query(
    `SELECT id, image_url, alt_text, display_order, created_at
     FROM room_images
     WHERE room_id = $1
     ORDER BY display_order ASC`,
    [roomId],
  );
}
