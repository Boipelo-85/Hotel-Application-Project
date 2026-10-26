import * as favouriteRepository from '../repositories/favourite.repository.js';
import { AppError } from '../utils/errors.js';

export async function getFavourites(userId: string) {
  const result = await favouriteRepository.listUserFavourites(userId);
  return result.rows.filter((hotel) => hotel.publication_status === 'published');
}

export async function addFavourite(userId: string, branchId: string) {
  const branch = await favouriteRepository.findBranchById(branchId);
  if (!branch.rows[0] || branch.rows[0].publication_status !== 'published') {
    throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  }
  const result = await favouriteRepository.addFavourite(userId, branchId);
  if (result.rowCount) return { favourite: result.rows[0], created: true };
  const existing = await favouriteRepository.getFavourite(userId, branchId);
  if (!existing.rows[0] || existing.rows[0].publication_status !== 'published') {
    throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  }
  return { favourite: existing.rows[0], created: false };
}

export async function removeFavourite(userId: string, branchId: string): Promise<void> {
  const existing = await favouriteRepository.getFavourite(userId, branchId);
  const favourite = existing.rows[0];
  if (!favourite) throw new AppError(404, 'Favourite not found', 'NOT_FOUND');
  const result = await favouriteRepository.removeFavouriteById(favourite.id);
  if (!result.rowCount) throw new AppError(404, 'Favourite not found', 'NOT_FOUND');
}
