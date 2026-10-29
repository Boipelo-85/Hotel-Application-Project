import type { RequestHandler } from 'express';
import {updateUserRole,deleteUserAccount,getUserProfile,updateUserProfile,} from '../services/user.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

export const getProfileController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({ user: await getUserProfile(request.auth.userId) });
};

export const updateProfileController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({ user: await updateUserProfile(request.auth.userId, request.body) });
};

export const updateUserRoleController: RequestHandler = async (request, response) => {
  response.json({
    user: await updateUserRole(getRouteParam(request, 'userId'), request.body.role),
  });
};

export function deleteProfileController(cookieName: string, secure = false): RequestHandler {
  return async (request, response) => {
    if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
    await deleteUserAccount(request.auth.userId);
    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    });
    response.status(204).end();
  };
}

export const getProfile = getProfileController;
export const updateProfile = updateProfileController;
export const deleteProfile = deleteProfileController;
