import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: JwtPayload, config: AppConfig): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '15m', jwtid: randomUUID(),
  });
}

export function generateRefreshToken(userId: string, config: AppConfig): string {
  return jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d', jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string, config: AppConfig): JwtPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string, config: AppConfig): { userId: string } {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
