import { inTransaction } from '../config/database.js';
import * as reviewRepository from '../repositories/review.repository.js';
import { AppError } from '../utils/errors.js';

export async function getBranchReviews(branchId: string) {
  const result = await reviewRepository.listBranchReviews(branchId);
  return result.rows
    .filter((review) => review.deleted_at === null && review.publication_status === 'published')
    .map(({ deleted_at: _deletedAt, publication_status: _publicationStatus, ...review }) => review);
}

export async function createReview(
  userId: string,
  input: { branchId: string; bookingId: string; rating: number; comment?: string | null },
) {
  return inTransaction(async (client) => {
    const bookingResult = await reviewRepository.findBookingForReview(client, input.bookingId);
    const booking = bookingResult.rows[0];
    const stayIsComplete = booking && (
      booking.status === 'completed' ||
      (booking.status === 'confirmed' && booking.check_out <= new Date().toISOString().slice(0, 10))
    );
    if (
      !booking ||
      booking.user_id !== userId ||
      booking.branch_id !== input.branchId ||
      !stayIsComplete
    ) {
      throw new AppError(409, 'A review requires a completed stay and may only be submitted once per booking', 'REVIEW_NOT_ALLOWED');
    }
    const result = await reviewRepository.createReview(
      client,
      userId,
      input.branchId,
      input.bookingId,
      input.rating,
      input.comment ?? null,
    );
    return result.rows[0];
  });
}

export async function updateReview(
  reviewId: string,
  userId: string,
  input: { rating: number; comment?: string | null },
) {
  return inTransaction(async (client) => {
    const existing = await reviewRepository.findReviewById(client, reviewId);
    const review = existing.rows[0];
    if (!review || review.user_id !== userId || review.deleted_at !== null) {
      throw new AppError(404, 'Review not found', 'NOT_FOUND');
    }
    const result = await reviewRepository.updateReview(
      client,
      reviewId,
      input.rating,
      input.comment ?? null,
    );
    if (!result.rows[0]) throw new AppError(404, 'Review not found', 'NOT_FOUND');
    return result.rows[0];
  });
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  await inTransaction(async (client) => {
    const existing = await reviewRepository.findReviewById(client, reviewId);
    const review = existing.rows[0];
    if (!review || review.user_id !== userId || review.deleted_at !== null) {
      throw new AppError(404, 'Review not found', 'NOT_FOUND');
    }
    const result = await reviewRepository.softDeleteReview(client, reviewId);
    if (!result.rowCount) throw new AppError(404, 'Review not found', 'NOT_FOUND');
  });
}
