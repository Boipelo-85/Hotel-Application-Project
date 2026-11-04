import type { RequestHandler } from 'express';
import { checkRoomAvailability, countNights } from '../services/availability.service.js';
import {
  createRoom as createRoomService,
  getRoomById as getRoomByIdService,
  listRooms,
  updateRoom as updateRoomService,
  addRoomImage as addRoomImageService,
  deleteRoomImage as deleteRoomImageService,
} from '../services/room.service.js';
import { listActiveReservations } from '../repositories/room.repository.js';
import { AppError, getRouteParam } from '../utils/errors.js';

function authenticated(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return { id: request.auth.userId, role: request.auth.role };
}

export const listRoomsController: RequestHandler = async (request, response) => {
  const routeBranchId = request.params.branchId;
  const branchId = (typeof routeBranchId === 'string' ? routeBranchId : undefined) ??
    (request.validatedQuery as { branchId?: string } | undefined)?.branchId;
  response.json({ rooms: await listRooms(branchId) });
};

export const getBranchRoomsController: RequestHandler = async (request, response) => {
  const branchId = getRouteParam(request, 'branchId');
  const query = request.validatedQuery as {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    quantity: number;
  };

  const rooms = await listRooms(branchId);

  if (query.checkIn && query.checkOut) {
    countNights(query.checkIn, query.checkOut);
    const nights = countNights(query.checkIn, query.checkOut);

    const roomsWithAvailability = await Promise.all(
      rooms.map(async (room: any) => {
        const reservations = await listActiveReservations(
          String(room.id),
          query.checkIn!,
          query.checkOut!
        );
        const reserved = reservations.rows[0]?.reserved || 0;
        const available = Math.max(room.quantity - reserved, 0);
        const pricePerNight = parseFloat(room.price);
        const totalPrice = pricePerNight * nights;

        return {
          ...room,
          quantity_available: available,
          price_per_night: pricePerNight,
          total_price: totalPrice,
          is_available: available >= query.quantity,
          can_accommodate_guests: query.guests ? room.capacity * query.quantity >= query.guests : true,
        };
      })
    );

    response.json({ rooms: roomsWithAvailability });
  } else {
    response.json({ rooms });
  }
};

export const createRoomController: RequestHandler = async (request, response) => {
  const routeBranchId = request.params.branchId;
  const branchId = (typeof routeBranchId === 'string' ? routeBranchId : undefined) ?? request.body.branchId;
  if (!branchId) throw new AppError(400, 'branchId is required', 'INVALID_DATA');
  response.status(201).json({
    room: await createRoomService(branchId, authenticated(request), request.body),
  });
};

export const getRoomController: RequestHandler = async (request, response) => {
  response.json({ room: await getRoomByIdService(getRouteParam(request, 'roomId')) });
};

export const updateRoomController: RequestHandler = async (request, response) => {
  response.json({ room: await updateRoomService(getRouteParam(request, 'roomId'), authenticated(request), request.body) });
};

export const checkAvailabilityController: RequestHandler = async (request, response) => {
  const roomId = getRouteParam(request, 'roomId');
  const { checkIn, checkOut, guests, quantity } = request.validatedQuery as {
    checkIn: string;
    checkOut: string;
    guests: number;
    quantity: number;
  };

  const availability = await checkRoomAvailability(roomId, checkIn, checkOut, quantity);
  response.json({
    ...availability,
    canAccommodateGuests: availability.canAccommodateGuests(guests, quantity),
  });
};

export const deleteRoomController: RequestHandler = async (request, response) => {
  await updateRoomService(getRouteParam(request, 'roomId'), authenticated(request), { status: 'inactive' });
  response.status(204).end();
};

export const addRoomImageController: RequestHandler = async (request, response) => {
  const roomId = getRouteParam(request, 'roomId');
  const user = authenticated(request);
  
  // Handle file upload
  if (request.file) {
    const imageUrl = `/uploads/rooms/${request.file.filename}`;
    const altText = request.body.altText || request.file.originalname;
    const displayOrder = request.body.displayOrder ? parseInt(request.body.displayOrder) : 0;
    const image = await addRoomImageService(roomId, user, { imageUrl, altText, displayOrder });
    response.status(201).json({ image });
    return;
  }
  
  // Handle multiple file uploads
  if (request.files && Array.isArray(request.files)) {
    const images = await Promise.all(
      request.files.map(async (file: Express.Multer.File, index: number) => {
        const imageUrl = `/uploads/rooms/${file.filename}`;
        const altText = file.originalname;
        const displayOrder = index;
        return await addRoomImageService(roomId, user, { imageUrl, altText, displayOrder });
      })
    );
    response.status(201).json({ images });
    return;
  }
  
  // Handle URL input (existing functionality)
  const { imageUrl, altText, displayOrder } = request.body;
  const image = await addRoomImageService(roomId, user, { imageUrl, altText, displayOrder });
  response.status(201).json({ image });
};

export const deleteRoomImageController: RequestHandler = async (request, response) => {
  await deleteRoomImageService(getRouteParam(request, 'roomId'), getRouteParam(request, 'imageId'), authenticated(request));
  response.status(204).end();
};

export const getRooms = listRoomsController;
export const getRoomById = getRoomController;
export const createRoom = createRoomController;
export const updateRoom = updateRoomController;
export const deleteRoom = deleteRoomController;
