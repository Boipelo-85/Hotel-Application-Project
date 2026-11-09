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
  try {
    console.log('listBranchesController called');
    const filters = request.validatedQuery as { search?: string; city?: string };
    console.log('Filters:', filters);
    const branches = await listBranches(filters.search, filters.city);
    console.log('Branches fetched:', branches.length);
    response.json({ branches });
  } catch (error) {
    console.error('Error in listBranchesController:', error);
    throw error;
  }
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

function branchUploadUrl(file: Express.Multer.File) {
  return file.path.startsWith('https://') ? file.path : `/uploads/branches/${file.filename}`;
}

export const addBranchImageController: RequestHandler = async (request, response) => {
  const branchId = getRouteParam(request, 'branchId');
  const user = authenticated(request);
  
  // Handle file upload
  if (request.file) {
    const imageUrl = branchUploadUrl(request.file);
    const altText = request.body.altText || request.file.originalname;
    const displayOrder = request.body.displayOrder ? parseInt(request.body.displayOrder) : 0;
    const image = await addBranchImage(branchId, user, { imageUrl, altText, displayOrder });
    response.status(201).json({ image });
    return;
  }
  
  // Handle multiple file uploads
  if (request.files && Array.isArray(request.files)) {
    const images = await Promise.all(
      request.files.map(async (file: Express.Multer.File, index: number) => {
        const imageUrl = branchUploadUrl(file);
        const altText = file.originalname;
        const displayOrder = index;
        return await addBranchImage(branchId, user, { imageUrl, altText, displayOrder });
      })
    );
    response.status(201).json({ images });
    return;
  }
  
  // Handle URL input (existing functionality)
  const { imageUrl, altText, displayOrder } = request.body;
  const image = await addBranchImage(branchId, user, { imageUrl, altText, displayOrder });
  response.status(201).json({ image });
};

export const setBranchAmenitiesController: RequestHandler = async (request, response) => {
  await setBranchAmenities(getRouteParam(request, 'branchId'), authenticated(request), request.body.amenityIds);
  response.status(204).end();
};

export const deleteBranchImageController: RequestHandler = async (request, response) => {
  await deleteBranchImage(getRouteParam(request, 'branchId'), getRouteParam(request, 'imageId'), authenticated(request));
  response.status(204).end();
};
