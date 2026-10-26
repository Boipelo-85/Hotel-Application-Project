import { Router } from 'express';
import { registerController, loginController } from '../controllers/auth-simple.controller.js';

export function authSimpleRoutes(): Router {
  const router = Router();
  router.post('/register', registerController);
  router.post('/login', loginController);
  return router;
}
