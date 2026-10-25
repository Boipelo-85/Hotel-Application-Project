import type { RequestHandler } from 'express';
import { AppError, getRouteParam } from '../utils/errors.js';
import {
  addHotelImage,
  archiveHotel,
  createAmenity,
  createHotel as createHotelService,
  deleteHotelImage,
  getHotel,
  listAmenities,
  listHotels,
  listManagedHotels,
  setHotelAmenities,
  updateHotel as updateHotelService,
  updateHotelPublicationStatus,
} from '../services/hotel.service.js';

function authenticated(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return { id: request.auth.userId, role: request.auth.role };
}

export const listHotelsController: RequestHandler = async (request, response) => {
  const search = request.validatedQuery as { search?: string };
  response.json({ hotels: await listHotels(search.search) });
};

export const listManagedHotelsController: RequestHandler = async (request, response) => {
  response.json({ hotels: await listManagedHotels(authenticated(request)) });
};

export const getHotelController: RequestHandler = async (request, response) => {
  response.json({ hotel: await getHotel(getRouteParam(request, 'hotelId')) });
};

export const createHotelController: RequestHandler = async (request, response) => {
  response.status(201).json({ hotel: await createHotelService(authenticated(request), request.body) });
};

export const updateHotelController: RequestHandler = async (request, response) => {
  response.json({ hotel: await updateHotelService(getRouteParam(request, 'hotelId'), authenticated(request), request.body) });
};

export const deleteHotelController: RequestHandler = async (request, response) => {
  await archiveHotel(getRouteParam(request, 'hotelId'), authenticated(request));
  response.status(204).end();
};

export const getHotels = listHotelsController;
export const getHotelById = getHotelController;
export const createHotel = createHotelController;
export const updateHotel = updateHotelController;
export const deleteHotel = deleteHotelController;

export const updateHotelStatusController: RequestHandler = async (request, response) => {
  response.json({
    hotel: await updateHotelPublicationStatus(getRouteParam(request, 'hotelId'), request.body.status),
  });
};

export const listAmenitiesController: RequestHandler = async (_request, response) => {
  response.json({ amenities: await listAmenities() });
};

export const createAmenityController: RequestHandler = async (request, response) => {
  response.status(201).json({ amenity: await createAmenity(request.body.name, request.body.category) });
};

export const addHotelImageController: RequestHandler = async (request, response) => {
  response.status(201).json({
    image: await addHotelImage(getRouteParam(request, 'hotelId'), authenticated(request), request.body),
  });
};

export const deleteHotelImageController: RequestHandler = async (request, response) => {
  await deleteHotelImage(getRouteParam(request, 'hotelId'), getRouteParam(request, 'imageId'), authenticated(request));
  response.status(204).end();
};

export const setHotelAmenitiesController: RequestHandler = async (request, response) => {
  await setHotelAmenities(getRouteParam(request, 'hotelId'), authenticated(request), request.body.amenityIds);
  response.status(204).end();
};
