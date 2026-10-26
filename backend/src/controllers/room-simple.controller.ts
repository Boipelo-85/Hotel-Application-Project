import type { RequestHandler } from 'express';
import {
  createRoom,
  findRoomById,
  findAllRooms,
  updateRoom,
  deleteRoom,
} from '../repositories/room-simple.repository.js';
import type { RoomInput } from '../types/models.js';

export const listRoomsController: RequestHandler = async (_request, response) => {
  const rooms = await findAllRooms();
  response.json({ rooms });
};

export const getRoomController: RequestHandler = async (request, response) => {
  const room_id = parseInt(request.params.id);
  if (isNaN(room_id)) {
    return response.status(400).json({ error: 'Invalid room ID' });
  }

  const room = await findRoomById(room_id);
  if (!room) {
    return response.status(404).json({ error: 'Room not found' });
  }

  response.json({ room });
};

export const createRoomController: RequestHandler = async (request, response) => {
  const room = await createRoom(request.body as RoomInput);
  response.status(201).json({ room });
};

export const updateRoomController: RequestHandler = async (request, response) => {
  const room_id = parseInt(request.params.id);
  if (isNaN(room_id)) {
    return response.status(400).json({ error: 'Invalid room ID' });
  }

  const room = await updateRoom(room_id, request.body as Partial<RoomInput>);
  if (!room) {
    return response.status(404).json({ error: 'Room not found' });
  }

  response.json({ room });
};

export const deleteRoomController: RequestHandler = async (request, response) => {
  const room_id = parseInt(request.params.id);
  if (isNaN(room_id)) {
    return response.status(400).json({ error: 'Invalid room ID' });
  }

  const deleted = await deleteRoom(room_id);
  if (!deleted) {
    return response.status(404).json({ error: 'Room not found' });
  }

  response.status(204).end();
};
