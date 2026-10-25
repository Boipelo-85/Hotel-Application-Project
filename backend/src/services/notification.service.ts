import nodemailer from 'nodemailer';
import type { AppConfig } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import {
  findNotificationById,
  listUserNotifications,
  setNotificationRead,
} from '../repositories/notification.repository.js';

export async function sendVerificationCode(config: AppConfig, email: string, code: string): Promise<void> {
  if (!config.SMTP_HOST || !config.SMTP_FROM) {
    throw new AppError(503, 'Email delivery is not configured', 'EMAIL_UNAVAILABLE');
  }
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER && config.SMTP_PASSWORD
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
  });
  await transporter.sendMail({
    from: config.SMTP_FROM,
    to: email,
    subject: 'Your hotel booking sign-in code',
    text: `Your verification code is ${code}. It expires in ${config.OTP_TTL_MINUTES} minutes.`,
  });
}

export async function listNotifications(userId: string): Promise<unknown[]> {
  const result = await listUserNotifications(userId);
  return result.rows;
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const notificationResult = await findNotificationById(notificationId);
  const notification = notificationResult.rows[0];
  if (!notification || notification.user_id !== userId) {
    throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  }
  const result = await setNotificationRead(notificationId);
  if (!result.rowCount) throw new AppError(404, 'Notification not found', 'NOT_FOUND');
}
