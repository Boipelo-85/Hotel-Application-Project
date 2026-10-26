import { query } from '../config/database.js';
import type { PoolClient } from 'pg';

export async function listBranchReviews(branchId: string) {
  return query(
    `SELECT rv.id, rv.user_id, u.name AS user_name, rv.branch_id, rv.rating, rv.comment,
            rv.created_at, rv.updated_at, rv.deleted_at, h.publication_status
     FROM reviews rv
     JOIN users u ON u.id = rv.user_id
     JOIN branches h ON h.id = rv.branch_id
     WHERE rv.branch_id = $1
     ORDER BY rv.created_at DESC`,
    [branchId],
  );
}

export async function findBookingForReview(client: PoolClient, bookingId: string) {
  return client.query<{
    id: string;
    user_id: string;
    branch_id: string;
    status: string;
    check_out: string;
  }>(
    `SELECT b.id, b.user_id, h.id AS branch_id, b.status, b.check_out
     FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     JOIN branches h ON h.id = r.branch_id
     WHERE b.id = $1
     FOR UPDATE OF b`,
    [bookingId],
  );
}

export async function createReview(
  client: PoolClient,
  userId: string,
  branchId: string,
  bookingId: string,
  rating: number,
  comment: string | null,
) {
  return client.query(
    `INSERT INTO reviews (user_id, branch_id, booking_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, branchId, bookingId, rating, comment],
  );
}

export async function findReviewById(client: PoolClient, reviewId: string) {
  return client.query<{ id: string; user_id: string; deleted_at: Date | null }>(
    'SELECT id, user_id, deleted_at FROM reviews WHERE id = $1 FOR UPDATE',
    [reviewId],
  );
}

export async function updateReview(
  client: PoolClient,
  reviewId: string,
  rating: number,
  comment: string | null,
) {
  return client.query(
    `UPDATE reviews SET rating = $2, comment = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [reviewId, rating, comment],
  );
}

export async function softDeleteReview(client: PoolClient, reviewId: string) {
  return client.query(
    `UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING id`,
    [reviewId],
  );
}
