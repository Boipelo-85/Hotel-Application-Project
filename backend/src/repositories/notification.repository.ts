import { query } from '../config/database.js';

export async function listUserNotifications(userId: string) {
  return query(
    `SELECT id, type, message, data, read_at, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
}

export async function findNotificationById(notificationId: string) {
  return query<{ id: string; user_id: string; read_at: Date | null }>(
    'SELECT id, user_id, read_at FROM notifications WHERE id = $1',
    [notificationId],
  );
}

export async function setNotificationRead(notificationId: string) {
  return query(
    `UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = $1`,
    [notificationId],
  );
}
