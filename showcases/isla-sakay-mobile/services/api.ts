export type AuthPrincipalType = "SUPERADMIN" | "ADMIN" | "BOAT_OPERATOR" | "USER";
export type BookingType = "person" | "cargo";

import {
  passenger, operator, boats, fares, contact, schedules, personBookings, cargoBookings,
  bookingOwners, notifications, refreshAvailability,
} from "../demo/fixtures";

// Keep these values aligned with frontend/web/src/types/models.ts and backend status strings.
export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "for_verification"
  | "for_cash_collection"
  | "confirmed"
  | "payment_rejected"
  | "affected_by_cancellation"
  | "cancelled"
  | "completed";

export type BookingPaymentStatus =
  | "pending"
  | "for_verification"
  | "for_cash_collection"
  | "verified"
  | "rejected"
  | "refunded";

export type BancaTripStatus =
  | "preparing"
  | "delayed"
  | "boarding"
  | "final_call"
  | "departure"
  | "in_transit"
  | "arrived"
  | "completed"
  | "cancelled"
  | "maintenance";

export type CargoTripStatus =
  | "preparing"
  | "delayed"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "maintenance";

export const BOOKING_STATUS_VALUES: BookingStatus[] = [
  "pending",
  "pending_payment",
  "for_verification",
  "for_cash_collection",
  "confirmed",
  "payment_rejected",
  "affected_by_cancellation",
  "cancelled",
  "completed",
];

export const BOOKING_PAYMENT_STATUS_VALUES: BookingPaymentStatus[] = [
  "pending",
  "for_verification",
  "for_cash_collection",
  "verified",
  "rejected",
  "refunded",
];

export type AuthLoginRequest = {
  principalType: AuthPrincipalType;
  username: string;
  password: string;
  forceLogin?: boolean;
};

export type AuthGoogleLoginRequest = {
  idToken: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  phone?: string;
  birthday?: string;
  pictureUrl?: string;
  googleSub?: string;
  forceLogin?: boolean;
};

export type AuthTokenResponse = {
  tokenType: string;
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string | null;
  refreshExpiresAt: string | null;
  sessionId: string;
  principalType: AuthPrincipalType;
  principalId: number;
  username: string;
};

export type AuthIntrospectResponse = {
  active: boolean;
  sessionId: string | null;
  principalType: AuthPrincipalType | null;
  principalId: number | null;
  username: string | null;
  accessExpiresAt: string | null;
  inactiveReason: string | null;
};

export type AuthGoogleProfileStatusResponse = {
  requiresProfileCompletion: boolean;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  phone: string | null;
  birthday: string | null;
};

export type AppUserProfile = {
  userId: number;
  googleSub: string;
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  birthday?: string | null;
  profilePictureUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type PublicScheduleConfig = {
  id: string;
  route: string;
  boatId?: string | null;
  boatName?: string | null;
  boatType?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  routeFareId?: string | null;
  origin?: string | null;
  destination?: string | null;
  capacity?: number | null;
  availableSeats?: number | null;
  cargoBooked?: boolean | null;
  cargoBookingStatus?: string | null;
  departure?: string | null;
  arrival?: string | null;
  departureDatetime?: string | null;
  arrivalDatetime?: string | null;
  frequency?: string | null;
  notes?: string | null;
  tripStatus?: string | null;
  tripStatusReason?: string | null;
  tripStatusEta?: string | null;
};

export type PublicFareConfig = {
  id: string;
  fareName: string;
  route: string;
  distanceKm: number;
  type: string;
  baseFare?: number | null;
  percentagePerKilometer?: number | null;
  rentalFare?: number | null;
  weightLimitKg?: number | null;
  isActive: boolean;
};

export type PublicContactConfig = {
  email: string;
  phone: string;
  officeAddress: string;
  officeHours: string;
};

export type BoatStatus = "registered" | "non_registered" | "coding" | "maintenance";

export type BoatRecord = {
  id: string;
  name: string;
  registrationNumber?: string | null;
  type: string;
  section: string;
  capacity: number;
  status: BoatStatus | string;
  operatorId?: string | null;
  operatorName?: string | null;
  operatorIds?: string[];
  operatorNames?: string[];
  clusterName?: string | null;
  routeNames?: string[];
  bancaTripStatus?: string | null;
  cargoTripStatus?: string | null;
  barangay?: string | null;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
  confirmedSeats?: number | null;
  pendingSeats?: number | null;
  availableSeats?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BoatOperatorProfile = {
  operatorId: number;
  username: string;
  fullName: string;
  licenseNumber: string;
  operatorType: string;
  email: string;
  contactNumber: string;
  birthday: string;
  mustChangePassword?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
};

export type PersonBookingRecord = {
  id: string;
  passengerName: string;
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
  paymentStatus: BookingPaymentStatus;
  paymentMethod?: "cash" | "gcash";
  paymentReference?: string;
  paymentProofImageUrl?: string;
  paymentNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CargoBookingRecord = {
  id: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  cargoDescription: string;
  weight: number;
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
  paymentStatus: BookingPaymentStatus;
  paymentMethod?: "cash" | "gcash";
  paymentReference?: string;
  paymentProofImageUrl?: string;
  paymentNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SystemNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  userId?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

export type RegisterDevicePushTokenPayload = {
  pushToken: string;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
};

export type BookingListFilters = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type BookingPagedFilters = BookingListFilters & {
  page?: number;
  size?: number;
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type CreatePersonBookingPayload = {
  passengerName: string;
  passengerPhone?: string;
  phone?: string;
  numberOfPassengers: number;
  seniorCitizenCount?: number;
  pwdCount?: number;
  seniorCitizenIds?: string[];
  pwdIds?: string[];
  destination: string;
  origin: string;
  date: string;
  time?: string;
  boatId?: string;
  scheduleId: string;
  farePerPassenger?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: "cash" | "gcash";
  paymentReference?: string;
  paymentProofImageUrl?: string;
};

export type CreateCargoBookingPayload = {
  senderName: string;
  senderPhone?: string;
  phone?: string;
  receiverName: string;
  receiverPhone: string;
  cargoDescription: string;
  weight: number;
  destination: string;
  origin: string;
  date: string;
  boatId?: string;
  scheduleId: string;
  totalAmount: number;
  paymentMethod?: "cash" | "gcash";
  paymentReference?: string;
  paymentProofImageUrl?: string;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// Every edit stays in browser memory until reload. This showcase never sends requests.
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let nextBookingId = 100;
let nextNotificationId = 100;
const normalized = (value: string) => value.trim().toLowerCase().replace(/[ -]+/g, "_");
const now = () => new Date().toISOString();

function fail(message: string, status = 400): never {
  throw new ApiError(message, status, { message });
}

function principal(token: string) {
  if (token === "demo-passenger") return { id: passenger.userId, type: "USER" as const };
  if (token === "demo-operator") return { id: operator.operatorId, type: "BOAT_OPERATOR" as const };
  return fail("Choose a sample passenger or operator account to continue.", 401);
}

function requireOperator(token: string) {
  const current = principal(token);
  if (current.type !== "BOAT_OPERATOR") fail("This sample action belongs to the operator account.", 403);
  return current;
}

function requirePassenger(token: string) {
  const current = principal(token);
  if (current.type !== "USER") fail("Switch to the sample passenger account to make a reservation.", 403);
  return current;
}

function authResponse(isOperator: boolean): AuthTokenResponse {
  return {
    tokenType: "Bearer", accessToken: isOperator ? "demo-operator" : "demo-passenger",
    accessExpiresAt: "2099-12-31T23:59:59Z", refreshToken: null, refreshExpiresAt: null,
    sessionId: isOperator ? "local-operator" : "local-passenger",
    principalType: isOperator ? "BOAT_OPERATOR" : "USER",
    principalId: isOperator ? operator.operatorId : passenger.userId,
    username: isOperator ? operator.username : passenger.email,
  };
}

function filterBookings<T extends PersonBookingRecord | CargoBookingRecord>(records: T[], filters: BookingListFilters): T[] {
  const query = filters.q?.trim().toLowerCase();
  const status = filters.status ? normalized(filters.status) : "";
  return records.filter((record) => (
    (!query || Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(query)))
    && (!status || status === "all" || normalized(record.status) === status)
    && (!filters.from || record.date >= filters.from.slice(0, 10))
    && (!filters.to || record.date <= filters.to.slice(0, 10))
  )).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

function pageBookings<T>(items: T[], filters: BookingPagedFilters): PagedResponse<T> {
  const page = Math.max(0, Math.floor(filters.page ?? 0));
  const size = Math.max(1, Math.min(100, Math.floor(filters.size ?? 20)));
  return clone({ items: items.slice(page * size, (page + 1) * size), page, size, totalItems: items.length, totalPages: Math.ceil(items.length / size) });
}

function ownedBooking(token: string, bookingId: string) {
  const current = principal(token);
  const booking = personBookings.find((entry) => entry.id === bookingId) ?? cargoBookings.find((entry) => entry.id === bookingId);
  if (!booking) return fail("This sample booking was not found. Reloading restores the original sample records.", 404);
  if (current.type !== "BOAT_OPERATOR" && bookingOwners.get(bookingId) !== current.id) fail("This booking belongs to another sample passenger.", 403);
  return booking;
}

function notify(userId: number, title: string, message: string, type = "booking") {
  notifications.unshift({ id: `demo-note-${++nextNotificationId}`, type, title, message, priority: "normal", isRead: false, userId: String(userId), createdAt: now() });
}

function notifyBooking(booking: PersonBookingRecord | CargoBookingRecord, title: string, message: string, type = "booking") {
  notify(bookingOwners.get(booking.id) ?? passenger.userId, title, message, type);
}

function bookingSchedule(scheduleId: string, cargo: boolean) {
  refreshAvailability();
  const schedule = schedules.find((entry) => entry.id === scheduleId);
  if (!schedule) return fail("Choose one of the available sample schedules.", 404);
  if ((schedule.boatType === "cargo") !== cargo) fail("Choose a schedule for the selected passenger or cargo service.");
  if (["cancelled", "completed", "maintenance"].includes(normalized(schedule.tripStatus ?? ""))) fail("This sample trip is closed. Choose a future schedule.", 409);
  return schedule;
}

function paymentFields(payload: { paymentMethod?: "cash" | "gcash"; paymentReference?: string; paymentProofImageUrl?: string }) {
  const cash = payload.paymentMethod === "cash";
  return {
    paymentMethod: cash ? "cash" as const : "gcash" as const,
    paymentStatus: cash ? "for_cash_collection" as const : "for_verification" as const,
    status: cash ? "for_cash_collection" as const : "for_verification" as const,
    paymentReference: cash ? undefined : payload.paymentReference,
    paymentProofImageUrl: cash ? undefined : payload.paymentProofImageUrl,
  };
}

export async function login(payload: AuthLoginRequest): Promise<AuthTokenResponse> {
  if (payload.principalType !== "USER" && payload.principalType !== "BOAT_OPERATOR") fail("The mobile demo offers passenger and operator accounts. Administration is in the web demo.");
  return authResponse(payload.principalType === "BOAT_OPERATOR");
}

export async function getGoogleProfileStatus(_payload: AuthGoogleLoginRequest): Promise<AuthGoogleProfileStatusResponse> {
  return { requiresProfileCompletion: false, firstName: passenger.firstName ?? null, lastName: passenger.lastName ?? null, nickname: passenger.nickname ?? null, phone: passenger.phone ?? null, birthday: passenger.birthday ?? null };
}

export async function loginWithGoogle(_payload: AuthGoogleLoginRequest): Promise<AuthTokenResponse> {
  return authResponse(false);
}

export async function introspectAccessToken(token: string): Promise<AuthIntrospectResponse> {
  if (token !== "demo-passenger" && token !== "demo-operator") return { active: false, sessionId: null, principalType: null, principalId: null, username: null, accessExpiresAt: null, inactiveReason: "sample_account_required" };
  const session = authResponse(token === "demo-operator");
  return { active: true, sessionId: session.sessionId, principalType: session.principalType, principalId: session.principalId, username: session.username, accessExpiresAt: session.accessExpiresAt, inactiveReason: null };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokenResponse> {
  if (!refreshToken.startsWith("demo-")) fail("Choose a sample account again to continue.", 401);
  return authResponse(refreshToken.includes("operator"));
}

export async function getAppUserById(userId: number, token: string): Promise<AppUserProfile> {
  principal(token);
  if (userId !== passenger.userId) fail("Sample passenger profile not found.", 404);
  return clone(passenger);
}

export async function getBoatOperatorById(operatorId: number, token: string): Promise<BoatOperatorProfile> {
  requireOperator(token);
  if (operatorId !== operator.operatorId) fail("Sample operator profile not found.", 404);
  return clone(operator);
}

export async function getBoats(token: string): Promise<BoatRecord[]> {
  principal(token);
  refreshAvailability();
  return clone(boats);
}

export async function updateBoatStatus(token: string, boatId: string, status: BoatStatus | string): Promise<BoatRecord> {
  requireOperator(token);
  const boat = boats.find((entry) => entry.id === boatId);
  if (!boat) return fail("Sample boat not found.", 404);
  const value = normalized(status);
  if (!["registered", "non_registered", "coding", "maintenance"].includes(value)) fail("Choose a valid sample boat status.");
  boat.status = value;
  boat.updatedAt = now();
  return clone(boat);
}

export async function updateAppUserBirthday(userId: number, birthday: string, token: string): Promise<AppUserProfile> {
  const current = requirePassenger(token);
  if (userId !== current.id) fail("This is not the current sample passenger.", 403);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(new Date(birthday).getTime())) fail("Enter a valid birthday using YYYY-MM-DD.");
  passenger.birthday = birthday;
  return clone(passenger);
}

export async function getPublicSchedules(from?: string, to?: string): Promise<PublicScheduleConfig[]> {
  refreshAvailability();
  return clone(schedules.filter((entry) => {
    const date = (entry.departureDatetime ?? entry.departure ?? "").slice(0, 10);
    return (!from || date >= from.slice(0, 10)) && (!to || date <= to.slice(0, 10));
  }));
}

export async function getPublicFares(): Promise<PublicFareConfig[]> { return clone(fares); }
export async function getPublicContact(): Promise<PublicContactConfig> { return clone(contact); }

export async function getPersonBookings(token: string, filters: BookingListFilters = {}): Promise<PersonBookingRecord[]> {
  requireOperator(token);
  return clone(filterBookings(personBookings, filters));
}

export async function getMyPersonBookings(token: string, filters: BookingListFilters = {}): Promise<PersonBookingRecord[]> {
  const current = principal(token);
  return clone(filterBookings(personBookings.filter((entry) => bookingOwners.get(entry.id) === current.id), filters));
}

export async function getCargoBookings(token: string, filters: BookingListFilters = {}): Promise<CargoBookingRecord[]> {
  requireOperator(token);
  return clone(filterBookings(cargoBookings, filters));
}

export async function getMyCargoBookings(token: string, filters: BookingListFilters = {}): Promise<CargoBookingRecord[]> {
  const current = principal(token);
  return clone(filterBookings(cargoBookings.filter((entry) => bookingOwners.get(entry.id) === current.id), filters));
}

export async function getPagedPersonBookings(token: string, filters: BookingPagedFilters = {}): Promise<PagedResponse<PersonBookingRecord>> {
  return pageBookings(await getPersonBookings(token, filters), filters);
}

export async function getPagedCargoBookings(token: string, filters: BookingPagedFilters = {}): Promise<PagedResponse<CargoBookingRecord>> {
  return pageBookings(await getCargoBookings(token, filters), filters);
}

export async function createPersonBooking(token: string, payload: CreatePersonBookingPayload): Promise<PersonBookingRecord> {
  const current = requirePassenger(token);
  const schedule = bookingSchedule(payload.scheduleId, false);
  const count = payload.numberOfPassengers;
  if (!Number.isInteger(count) || count <= 0) fail("Enter a valid passenger count.");
  if (count > (schedule.availableSeats ?? 0)) fail("This sample trip does not have enough seats. Choose another schedule.", 409);
  if (!payload.passengerName.trim()) fail("A passenger name is required.");
  if (!Number.isFinite(payload.totalAmount) || payload.totalAmount < 0) fail("The sample fare must be a valid amount.");
  const fare = fares.find((entry) => entry.id === schedule.routeFareId);
  const seniorCount = payload.seniorCitizenCount ?? 0;
  const pwdCount = payload.pwdCount ?? 0;
  if (seniorCount < 0 || pwdCount < 0 || seniorCount + pwdCount > count) fail("Discounted passengers cannot exceed the total passenger count.");
  const booking: PersonBookingRecord = {
    id: `DEMO-PAX-${++nextBookingId}`, passengerName: payload.passengerName.trim(),
    passengerPhone: payload.passengerPhone ?? payload.phone ?? passenger.phone ?? "", numberOfPassengers: count,
    seniorCitizenCount: seniorCount, pwdCount, seniorCitizenIds: payload.seniorCitizenIds?.join(", "), pwdIds: payload.pwdIds?.join(", "),
    farePerPassenger: payload.farePerPassenger, discountAmount: payload.discountAmount ?? 0,
    origin: schedule.origin ?? payload.origin, destination: schedule.destination ?? payload.destination,
    date: (schedule.departureDatetime ?? schedule.departure ?? payload.date).slice(0, 10),
    time: payload.time ?? (schedule.departureDatetime ?? "").slice(11, 16),
    boatId: schedule.boatId ?? payload.boatId, scheduleId: schedule.id,
    scheduleLabel: `${schedule.boatName ?? "Sample boat"} - ${(schedule.departureDatetime ?? "").slice(11, 16)}`,
    fareId: fare?.id, fareName: fare?.fareName, totalAmount: payload.totalAmount,
    ...paymentFields(payload), createdAt: now(), updatedAt: now(),
  };
  personBookings.unshift(booking);
  bookingOwners.set(booking.id, current.id);
  refreshAvailability();
  notify(current.id, "Sample passenger booking created", `${booking.id} is saved in this browser session. No actual reservation or payment was made.`);
  notify(operator.operatorId, "New sample passenger booking", `${booking.id} is awaiting sample payment review.`, "payment");
  return clone(booking);
}

export async function createCargoBooking(token: string, payload: CreateCargoBookingPayload): Promise<CargoBookingRecord> {
  const current = requirePassenger(token);
  const schedule = bookingSchedule(payload.scheduleId, true);
  if (schedule.cargoBooked) fail("This sample cargo trip is already booked. Choose another date.", 409);
  if (!payload.senderName.trim() || !payload.receiverName.trim() || !payload.cargoDescription.trim()) fail("Enter the sample sender, receiver, and cargo description.");
  if (!Number.isFinite(payload.weight) || payload.weight <= 0) fail("Enter a valid cargo weight.");
  if (!Number.isFinite(payload.totalAmount) || payload.totalAmount < 0) fail("The sample fare must be a valid amount.");
  const fare = fares.find((entry) => entry.id === schedule.routeFareId);
  const booking: CargoBookingRecord = {
    id: `DEMO-CARGO-${++nextBookingId}`, senderName: payload.senderName.trim(), senderPhone: payload.senderPhone ?? payload.phone ?? passenger.phone ?? "",
    receiverName: payload.receiverName.trim(), receiverPhone: payload.receiverPhone, cargoDescription: payload.cargoDescription.trim(), weight: payload.weight,
    origin: schedule.origin ?? payload.origin, destination: schedule.destination ?? payload.destination,
    date: (schedule.departureDatetime ?? schedule.departure ?? payload.date).slice(0, 10),
    boatId: schedule.boatId ?? payload.boatId, scheduleId: schedule.id,
    scheduleLabel: `${schedule.boatName ?? "Sample boat"} - ${(schedule.departureDatetime ?? "").slice(11, 16)}`,
    fareId: fare?.id, fareName: fare?.fareName, totalAmount: payload.totalAmount,
    ...paymentFields(payload), createdAt: now(), updatedAt: now(),
  };
  cargoBookings.unshift(booking);
  bookingOwners.set(booking.id, current.id);
  refreshAvailability();
  notify(current.id, "Sample cargo booking created", `${booking.id} is saved in this browser session. No real delivery or payment was made.`);
  notify(operator.operatorId, "New sample cargo booking", `${booking.id} is awaiting sample payment review.`, "payment");
  return clone(booking);
}

export async function updateBookingStatus(token: string, bookingId: string, status: string): Promise<{ message: string }> {
  requireOperator(token);
  const booking = ownedBooking(token, bookingId);
  const value = normalized(status);
  if (!BOOKING_STATUS_VALUES.includes(value as BookingStatus)) fail("Choose a valid sample booking status.");
  booking.status = value as BookingStatus;
  booking.updatedAt = now();
  refreshAvailability();
  notifyBooking(booking, "Sample booking status updated", `${booking.id} is now ${value.replace(/_/g, " ")}.`);
  return { message: "Sample booking status updated in browser memory." };
}

export async function updateScheduleTripStatus(token: string, scheduleId: string, payload: { status: string; reason?: string; estimatedDepartureDatetime?: string }): Promise<PublicScheduleConfig> {
  requireOperator(token);
  const schedule = schedules.find((entry) => entry.id === scheduleId);
  if (!schedule) return fail("Sample schedule not found.", 404);
  const status = normalized(payload.status);
  const allowed = schedule.boatType === "cargo"
    ? ["preparing", "delayed", "out_for_delivery", "delivered", "completed", "cancelled", "maintenance"]
    : ["preparing", "delayed", "boarding", "final_call", "departure", "in_transit", "arrived", "completed", "cancelled", "maintenance"];
  if (!allowed.includes(status)) fail("Choose a valid sample trip status.");
  if ((status === "cancelled" || status === "delayed") && !payload.reason?.trim()) fail("Add a sample reason for this change.");
  schedule.tripStatus = status;
  schedule.tripStatusReason = payload.reason?.trim() ?? null;
  schedule.tripStatusEta = payload.estimatedDepartureDatetime ?? null;
  const boat = boats.find((entry) => entry.id === schedule.boatId);
  if (boat) {
    if (schedule.boatType === "cargo") boat.cargoTripStatus = status;
    else boat.bancaTripStatus = status;
    boat.updatedAt = now();
  }
  const affected = [...personBookings, ...cargoBookings].filter((entry) => entry.scheduleId === schedule.id && !["cancelled", "payment_rejected"].includes(entry.status));
  for (const booking of affected) {
    if (status === "cancelled") booking.status = "affected_by_cancellation";
    if (status === "completed" && booking.paymentStatus === "verified") booking.status = "completed";
    booking.updatedAt = now();
    notifyBooking(booking, "Sample trip updated", `${schedule.boatName}: ${status.replace(/_/g, " ")}.${payload.reason ? ` ${payload.reason.trim()}` : ""}`, "schedule");
  }
  refreshAvailability();
  return clone(schedule);
}

export async function cancelBooking(token: string, bookingId: string): Promise<{ message: string }> {
  const booking = ownedBooking(token, bookingId);
  if (booking.status === "completed") fail("A completed sample booking cannot be cancelled.", 409);
  booking.status = "cancelled";
  if (booking.paymentStatus === "verified") booking.paymentStatus = "refunded";
  booking.updatedAt = now();
  refreshAvailability();
  notifyBooking(booking, "Sample booking cancelled", `${booking.id} was cancelled in memory. No real reservation or refund was processed.`);
  return { message: "Sample booking cancelled. No real payment was processed." };
}

export async function verifyBookingPayment(token: string, bookingId: string, approved: boolean, reason?: string): Promise<{ message: string }> {
  requireOperator(token);
  const booking = ownedBooking(token, bookingId);
  if (["cancelled", "completed", "affected_by_cancellation"].includes(booking.status)) fail("This sample booking is closed for payment review.", 409);
  if (!approved && !reason?.trim()) fail("Enter a sample reason for rejecting this payment.");
  booking.paymentStatus = approved ? "verified" : "rejected";
  booking.status = approved ? "confirmed" : "payment_rejected";
  booking.paymentNotes = approved ? "Fictional sample payment verified. No funds were transferred." : reason?.trim();
  booking.verifiedBy = operator.fullName;
  booking.verifiedAt = now();
  booking.updatedAt = now();
  refreshAvailability();
  notifyBooking(booking, approved ? "Sample payment verified" : "Sample payment rejected", `${booking.id}: ${approved ? "your fictional trip is confirmed." : reason?.trim()}`, "payment");
  return { message: approved ? "Sample payment approved in memory." : "Sample payment rejected in memory." };
}

export async function attachMyBookingPaymentProof(token: string, bookingId: string, paymentProofImageUrl: string, paymentReference?: string): Promise<{ message: string }> {
  requirePassenger(token);
  const booking = ownedBooking(token, bookingId);
  if (["cancelled", "completed", "affected_by_cancellation"].includes(booking.status)) fail("This sample booking is closed for receipt updates.", 409);
  if (!paymentProofImageUrl.startsWith("data:image/") && !paymentProofImageUrl.startsWith("blob:")) fail("Choose a local sample receipt image. It remains in browser memory.");
  booking.paymentProofImageUrl = paymentProofImageUrl;
  booking.paymentReference = paymentReference?.trim() || booking.paymentReference;
  booking.paymentMethod = "gcash";
  booking.paymentStatus = "for_verification";
  booking.status = "for_verification";
  booking.paymentNotes = undefined;
  booking.verifiedBy = undefined;
  booking.verifiedAt = undefined;
  booking.updatedAt = now();
  refreshAvailability();
  notify(operator.operatorId, "Updated sample receipt", `${booking.id} has a new local sample receipt to review.`, "payment");
  notifyBooking(booking, "Sample receipt submitted", `${booking.id} is awaiting fictional payment verification.`, "payment");
  return { message: "Sample receipt attached in browser memory. Nothing was uploaded." };
}

export async function getMyNotifications(token: string): Promise<SystemNotification[]> {
  const current = principal(token);
  return clone(notifications.filter((entry) => !entry.userId || entry.userId === String(current.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function markNotificationRead(token: string, id: string): Promise<{ message: string }> {
  const current = principal(token);
  const notification = notifications.find((entry) => entry.id === id && (!entry.userId || entry.userId === String(current.id)));
  if (!notification) fail("Sample notification not found.", 404);
  notification.isRead = true;
  return { message: "Sample notification marked as read." };
}

export async function markAllNotificationsRead(token: string): Promise<{ message: string; updatedCount: number }> {
  const current = principal(token);
  let updatedCount = 0;
  for (const notification of notifications) {
    if ((!notification.userId || notification.userId === String(current.id)) && !notification.isRead) {
      notification.isRead = true;
      updatedCount += 1;
    }
  }
  return { message: "Sample notifications marked as read.", updatedCount };
}

export async function registerDevicePushToken(token: string, _payload: RegisterDevicePushTokenPayload): Promise<{ message: string; id: string }> {
  principal(token);
  return { message: "Push registration is disabled in this local showcase.", id: "demo-push-disabled" };
}

export async function registerPublicDevicePushToken(_payload: RegisterDevicePushTokenPayload): Promise<{ message: string; id: string }> {
  return { message: "Push registration is disabled in this local showcase.", id: "demo-push-disabled" };
}

export async function unregisterDevicePushToken(token: string, _pushToken: string): Promise<{ message: string; removed: boolean }> {
  principal(token);
  return { message: "No push token was registered in this showcase.", removed: false };
}


