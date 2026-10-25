export type UserRole = 'customer' | 'hotel_partner' | 'admin';

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

export interface BookingRow {
  id: string;
  booking_reference: string;
  user_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  quantity: number;
  price_per_night_snapshot: string;
  total_amount: string;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  hotel_name?: string;
  room_type?: string;
}

export interface HotelInput {
  name?: string;
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
