export type UserRole = 'super_admin' | 'admin' | 'operator' | 'user';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isOnline?: boolean;
  lastSeenAt?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'for_verification'
  | 'for_cash_collection'
  | 'confirmed'
  | 'payment_rejected'
  | 'affected_by_cancellation'
  | 'cancelled'
  | 'completed';
export type BookingType = 'person' | 'cargo';

export interface PersonBooking {
  id: string;
  passengerName: string;
  passengerEmail?: string;
  passengerPhone: string;
  numberOfPassengers: number;
  seniorCitizenCount?: number;
  pwdCount?: number;
  seniorCitizenIds?: string;
  pwdIds?: string;
  farePerPassenger?: number;
  discountAmount?: number;
  destination: string;
  origin: string;
  date: string;
  time: string;
  boatId?: string;
  scheduleId?: string;
  scheduleLabel?: string;
  fareId?: string;
  fareName?: string;
  status: BookingStatus;
  totalAmount: number;
  paymentStatus: 'pending' | 'for_verification' | 'for_cash_collection' | 'verified' | 'rejected' | 'refunded';
  paymentMethod?: 'cash' | 'gcash';
  paymentReference?: string;
  paymentProofImageUrl?: string;
  paymentNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CargoBooking {
  id: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  cargoDescription: string;
  weight: number;
  dimensions?: string;
  destination: string;
  origin: string;
  date: string;
  boatId?: string;
  scheduleId?: string;
  scheduleLabel?: string;
  fareId?: string;
  fareName?: string;
  status: BookingStatus;
  totalAmount: number;
  paymentStatus: 'pending' | 'for_verification' | 'for_cash_collection' | 'verified' | 'rejected' | 'refunded';
  paymentMethod?: 'cash' | 'gcash';
  paymentReference?: string;
  paymentProofImageUrl?: string;
  paymentNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type BoatStatus = 'registered' | 'non_registered' | 'coding' | 'maintenance';
export type BoatType = 'banca' | 'cargo' | 'passenger';
export type BoatSection = 'banca' | 'cargo' | 'cluster';
export type BancaTripStatus =
  | 'preparing'
  | 'delayed'
  | 'boarding'
  | 'final_call'
  | 'departure'
  | 'in_transit'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'maintenance';
export type CargoTripStatus =
  | 'preparing'
  | 'delayed'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'maintenance';

export interface Boat {
  id: string;
  name: string;
  registrationNumber?: string;
  type: BoatType;
  section: BoatSection;
  capacity: number;
  status: BoatStatus;
  operatorId: string;
  operatorName: string;
  operatorIds?: string[];
  operatorNames?: string[];
  clusterName?: string;
  routeNames?: string[];
  bancaTripStatus?: BancaTripStatus;
  cargoTripStatus?: CargoTripStatus;
  barangay?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  confirmedSeats?: number;
  pendingSeats?: number;
  availableSeats?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BoatOperator {
  id: string;
  username?: string;
  name: string;
  email?: string;
  phone: string;
  licenseNumber?: string;
  operatorType?: 'cargo' | 'banca';
  birthday?: string;
  boats: string[]; 
  status: UserStatus;
  isOnline?: boolean;
  lastSeenAt?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType = 'weather' | 'coast_guard' | 'system' | 'alert' | 'booking' | 'payment';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  userId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface WeatherAlert extends Notification {
  type: 'weather';
  weatherCondition: string;
  affectedAreas: string[];
  windSpeed?: number;
  waveHeight?: number;
}

export interface CoastGuardNotification extends Notification {
  type: 'coast_guard';
  advisoryType: 'warning' | 'info' | 'restriction';
  affectedRoutes?: string[];
}

export type PaymentMethod = 'cash' | 'gcash' | 'paymaya' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNumber?: string;
  proofImageUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Form Types
export interface CreateBookingForm {
  passengerName?: string;
  numberOfPassengers?: number;
  seniorCitizenCount?: number;
  pwdCount?: number;
  seniorCitizenIds?: string[];
  pwdIds?: string[];
  farePerPassenger?: number;
  discountAmount?: number;
  passengerEmail?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  cargoDescription?: string;
  weight?: number;
  totalAmount?: number;
  paymentMethod?: 'cash' | 'gcash';
  paymentReference?: string;
  paymentProofImageUrl?: string;
  phone?: string;
  scheduleId?: string;
  destination: string;
  origin: string;
  date: string;
  time?: string;
  boatId?: string;
}

export interface CreateBoatForm {
  name: string;
  registrationNumber?: string;
  type: BoatType;
  section: BoatSection;
  capacity: number;
  status?: BoatStatus;
  operatorId: string;
  operatorName?: string;
  operatorIds?: string[];
  operatorNames?: string[];
  barangay?: string;
  routeNames?: string[];
}

export interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
}
