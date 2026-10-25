import type { UserRole } from './models.js';

//  Authentication payload added by auth middleware

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

//  Common query parameters
//  Extend this as your project grows.

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

declare global {
  namespace Express {
    interface Request {
      // Set by session authentication middleware.
      auth?: AuthPayload;

      // Set by query validation middleware.
      validatedQuery?: Record<string, unknown>;
    }
  }
}

// Required so TypeScript treats this file as a module
export {};
