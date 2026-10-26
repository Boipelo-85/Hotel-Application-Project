import type { RequestHandler } from 'express';
import { findHotelBrand, updateHotelBrand } from '../repositories/hotel-brand.repository.js';
import { AppError } from '../utils/errors.js';

export const getHotelBrandController: RequestHandler = async (_request, response) => {
  const result = await findHotelBrand();
  if (!result.rows[0]) throw new AppError(404, 'Hotel brand not found', 'NOT_FOUND');
  response.json({ brand: result.rows[0] });
};

export const updateHotelBrandController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  const result = await updateHotelBrand(request.body);
  if (!result.rows[0]) throw new AppError(404, 'Hotel brand not found', 'NOT_FOUND');
  response.json({ brand: result.rows[0] });
};
