import { Router } from 'express';
import {
  listRoomsController,
  getRoomController,
  createRoomController,
  updateRoomController,
  deleteRoomController,
} from '../controllers/room-simple.controller.js';

export function roomSimpleRoutes(): Router {
  const router = Router();
  router.get('/', listRoomsController);
  router.get('/:id', getRoomController);
  router.post('/', createRoomController);
  router.put('/:id', updateRoomController);
  router.delete('/:id', deleteRoomController);
  return router;
}
