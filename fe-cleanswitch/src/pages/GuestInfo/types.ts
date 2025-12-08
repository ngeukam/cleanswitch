export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  date_joined?: string;
}

export interface Apartment {
  id: string;
  number: number;
  name: string;
  property_assigned_name: string;
  property_address: string;
  cleaned: boolean;
  apartmentType: string;
  capacity: number;
  currency:string;
}

interface Booking {
  id: number;
  apartments: Apartment[];
  guest: number;
  dateOfReservation: string;
  startDate: string;
  endDate: string;
  duration: number;
  added_by_user: User;
  status: string;
  totalPrice: number;
  updated_at: string;
}

export interface Guest {
  id: string;
  user: User;
  current_apartments?: string[];
  booking_count?: number;
  id_card_url?: string;
  booking_stats?: {
    total_bookings: number;
    total_days_stayed: number;
    last_booking_duration: number;
  };
  recent_bookings?: Booking[];
}

export interface GuestCreateUpdateData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_card?: any;
  password?: string;
}