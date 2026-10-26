import type { RequestHandler } from 'express';
import { AppError, getRouteParam } from '../utils/errors.js';
import {
  addFavourite as addFavouriteService,
  getFavourites as getFavouritesService,
  removeFavourite as removeFavouriteService,
} from '../services/favourite.service.js';

function userId(request: Parameters<RequestHandler>[0]): string {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return request.auth.userId;
}

export const listFavouritesController: RequestHandler = async (request, response) => {
  response.json({ favourites: await getFavouritesService(userId(request)) });
};

export const addFavouriteController: RequestHandler = async (request, response) => {
  const id = userId(request);
  const result = await addFavouriteService(id, request.body.branchId);
  response.status(result.created ? 201 : 200).json({ favourite: result.favourite });
};

export const deleteFavouriteController: RequestHandler = async (request, response) => {
  await removeFavouriteService(userId(request), getRouteParam(request, 'branchId'));
  response.status(204).end();
};

export const getFavourites = listFavouritesController;
export const removeFavourite = deleteFavouriteController;
export const addFavourite = addFavouriteController;
