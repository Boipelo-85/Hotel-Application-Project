//User types

export type UserRole = 'customer' | 'branch_manager' | 'admin';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

//Booking types

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export interface BookingRow {
  id: string;
  booking_reference: string;

  user_id: string | null;
  room_id: string;

  check_in: string;
  check_out: string;

  guests: number;
  quantity: number;

  // PostgreSQL NUMERIC values are returned as strings.
  price_per_night_snapshot: string;
  total_amount: string;
  currency: string;

  status: BookingStatus;

  expires_at: Date | null;

  created_at: Date;
  updated_at: Date;

  // Optional fields from JOIN queries
  branch_name?: string;
  room_type?: string;
}

//Hotel types

export interface BranchRow {
  id: string;
  owner_id: string;

  name: string;
  address: string;

  description: string | null;

  policies: Record<string, string>;

  star_rating: number | null;

  contact_email: string | null;
  contact_phone: string | null;

  latitude: number | null;
  longitude: number | null;

  created_at: Date;
  updated_at: Date;
}

// Used for create/update requests

export interface BranchInput {
  name?: string;
  managerUserId?: string | null;
  city?: string;
  province?: string;
  address?: string;

  description?: string | null;

  policies?: Record<string, string>;

  starRating?: number | null;
  pricePerNight?: number;
  currency?: string;

  contactEmail?: string | null;
  contactPhone?: string | null;

  latitude?: number | null;
  longitude?: number | null;
}

//Rooms types

export interface RoomRow {
  id: string;

  branch_id: string;

  room_type: string;
  description: string | null;

  capacity: number;

  quantity_available: number;

  price_per_night: string;
  currency: string;

  created_at: Date;
  updated_at: Date;
}

export interface RoomInput {
  roomType?: string;
  description?: string | null;
  capacity?: number;
  quantityAvailable?: number;
  pricePerNight?: number;
  currency?: string;
}

// User types for simple controller

export interface User {
  user_id: number;
  fullname: string;
  email: string;
  password: string;
  role: UserRole;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserInput {
  fullname: string;
  email: string;
  password: string;
  role?: UserRole;
}

// Payment types

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  payment_id: number;
  booking_id: number;
  amount: string;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  transaction_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PaymentInput {
  booking_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
}
