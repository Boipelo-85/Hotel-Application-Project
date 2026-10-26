import type { RequestHandler } from 'express';
import { AppError, getRouteParam } from '../utils/errors.js';
import {
  addBranchImage,
  assignBranchManager as assignBranchManagerService,
  archiveBranch,
  createAmenity,
  createBranch as createBranchService,
  deleteBranchImage,
  getBranch,
  listAmenities,
  listBranches,
  listManagedBranches,
  searchAvailableBranches,
  setBranchAmenities,
  updateBranch as updateBranchService,
  updateBranchPublicationStatus,
} from '../services/branch.service.js';

function authenticated(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return { id: request.auth.userId, role: request.auth.role };
}

export const listBranchesController: RequestHandler = async (request, response) => {
  const filters = request.validatedQuery as { search?: string; city?: string };
  response.json({ branches: await listBranches(filters.search, filters.city) });
};

export const searchBranchesController: RequestHandler = async (request, response) => {
  const filters = request.validatedQuery as {
    destination: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    guests: number;
  };
  response.json(await searchAvailableBranches(filters));
};

export const assignBranchManagerController: RequestHandler = async (request, response) => {
  response.json({
    branch: await assignBranchManagerService(
      getRouteParam(request, 'branchId'),
      request.body.managerUserId,
    ),
  });
};

export const listManagedBranchesController: RequestHandler = async (request, response) => {
  response.json({ branches: await listManagedBranches(authenticated(request)) });
};

export const getBranchController: RequestHandler = async (request, response) => {
  response.json({ branch: await getBranch(getRouteParam(request, 'branchId')) });
};

export const createBranchController: RequestHandler = async (request, response) => {
  response.status(201).json({ branch: await createBranchService(authenticated(request), request.body) });
};

export const updateBranchController: RequestHandler = async (request, response) => {
  response.json({ branch: await updateBranchService(getRouteParam(request, 'branchId'), authenticated(request), request.body) });
};

export const deleteBranchController: RequestHandler = async (request, response) => {
  await archiveBranch(getRouteParam(request, 'branchId'), authenticated(request));
  response.status(204).end();
};

export const getBranches = listBranchesController;
export const getBranchById = getBranchController;
export const createBranch = createBranchController;
export const updateBranch = updateBranchController;
export const deleteBranch = deleteBranchController;

export const updateBranchStatusController: RequestHandler = async (request, response) => {
  response.json({
    branch: await updateBranchPublicationStatus(getRouteParam(request, 'branchId'), request.body.status),
  });
};

export const listAmenitiesController: RequestHandler = async (_request, response) => {
  response.json({ amenities: await listAmenities() });
};

export const createAmenityController: RequestHandler = async (request, response) => {
  response.status(201).json({ amenity: await createAmenity(request.body.name, request.body.category) });
};

export const addBranchImageController: RequestHandler = async (request, response) => {
  response.status(201).json({
    image: await addBranchImage(getRouteParam(request, 'branchId'), authenticated(request), request.body),
  });
};

export const deleteBranchImageController: RequestHandler = async (request, response) => {
  await deleteBranchImage(getRouteParam(request, 'branchId'), getRouteParam(request, 'imageId'), authenticated(request));
  response.status(204).end();
};

export const setBranchAmenitiesController: RequestHandler = async (request, response) => {
  await setBranchAmenities(getRouteParam(request, 'branchId'), authenticated(request), request.body.amenityIds);
  response.status(204).end();
};
