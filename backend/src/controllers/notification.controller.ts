import type { RequestHandler } from 'express';
import { listNotifications, markNotificationRead } from '../services/notification.service.js';
import { AppError, getRouteParam } from '../utils/errors.js';

export const listNotificationsController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  response.json({ notifications: await listNotifications(request.auth.userId) });
};

export const markNotificationReadController: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  await markNotificationRead(request.auth.userId, getRouteParam(request, 'notificationId'));
  response.status(204).end();
};

export const getNotifications = listNotificationsController;
export const markAsRead = markNotificationReadController;
