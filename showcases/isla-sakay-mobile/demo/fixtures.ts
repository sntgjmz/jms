/** Fictional, browser-memory fixtures. Nothing here belongs to a real passenger or payment. */
import type {
  AppUserProfile,
  BoatOperatorProfile,
  BoatRecord,
  CargoBookingRecord,
  PersonBookingRecord,
  PublicContactConfig,
  PublicFareConfig,
  PublicScheduleConfig,
  SystemNotification,
} from "../services/api";

const dayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
}).formatToParts(new Date());
const datePart = (part: Intl.DateTimeFormatPartTypes) => dayParts.find((item) => item.type === part)?.value ?? "";
const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

export function demoDate(offset = 0) {
  const date = new Date(`${today}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function demoTimestamp(offset = 0, time = "08:00") {
  return `${demoDate(offset)}T${time}:00+08:00`;
}

export const passenger: AppUserProfile = {
  userId: 1, googleSub: "fictional-demo-passenger", email: "passenger.demo@example.com",
  fullName: "Mara Demo", firstName: "Mara", middleName: "", lastName: "Demo", nickname: "Mara",
  phone: "09000000001", birthday: "1999-04-15", profilePictureUrl: null, isActive: true,
  createdAt: demoTimestamp(-90), lastLoginAt: new Date().toISOString(),
};

export const operator: BoatOperatorProfile = {
  operatorId: 101, username: "demo.operator", fullName: "Alex Demo", licenseNumber: "DEMO-LICENSE-101",
  operatorType: "Banca and cargo", email: "operator.demo@example.com", contactNumber: "09000000101",
  birthday: "1990-08-20", mustChangePassword: false, isActive: true, isOnline: true,
  createdAt: demoTimestamp(-120), lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(),
};

export const boats: BoatRecord[] = [
  { id: "demo-boat-1", name: "Isla Aurora", registrationNumber: "DEMO-BANCA-001", type: "banca", section: "Passenger", capacity: 30, status: "registered", operatorId: "101", operatorName: operator.fullName, operatorIds: ["101"], operatorNames: [operator.fullName], clusterName: "Talim Demo Cluster", barangay: "Janosa", routeNames: ["Binangonan Port – Janosa"], bancaTripStatus: "preparing", lastMaintenance: demoDate(-20), nextMaintenance: demoDate(40), createdAt: demoTimestamp(-120) },
  { id: "demo-boat-2", name: "Talim Voyager", registrationNumber: "DEMO-BANCA-002", type: "banca", section: "Passenger", capacity: 24, status: "registered", operatorId: "101", operatorName: operator.fullName, operatorIds: ["101"], operatorNames: [operator.fullName], clusterName: "Talim Demo Cluster", barangay: "Navotas", routeNames: ["Binangonan Port – Navotas"], bancaTripStatus: "boarding", lastMaintenance: demoDate(-10), nextMaintenance: demoDate(50), createdAt: demoTimestamp(-90) },
  { id: "demo-boat-3", name: "Isla Cargo", registrationNumber: "DEMO-CARGO-003", type: "cargo", section: "Cargo", capacity: 500, status: "registered", operatorId: "101", operatorName: operator.fullName, operatorIds: ["101"], operatorNames: [operator.fullName], clusterName: "Talim Demo Cluster", barangay: "Janosa", routeNames: ["Binangonan Port – Janosa"], cargoTripStatus: "preparing", lastMaintenance: demoDate(-15), nextMaintenance: demoDate(45), createdAt: demoTimestamp(-100) },
];

export const fares: PublicFareConfig[] = [
  { id: "demo-fare-1", fareName: "Janosa commuter fare", route: "Binangonan Port – Janosa", distanceKm: 5, type: "commuter", baseFare: 40, percentagePerKilometer: 6.25, isActive: true },
  { id: "demo-fare-2", fareName: "Navotas commuter fare", route: "Binangonan Port – Navotas", distanceKm: 7, type: "commuter", baseFare: 40, percentagePerKilometer: 12.5, isActive: true },
  { id: "demo-fare-3", fareName: "Janosa sample cargo rental", route: "Binangonan Port – Janosa", distanceKm: 5, type: "cargo", rentalFare: 450, weightLimitKg: 100, isActive: true },
];

export const contact: PublicContactConfig = {
  email: "support@islasakay.example", phone: "09000000000", officeAddress: "Sample transport office, Binangonan Port, Rizal",
  officeHours: "Demo office: Monday–Saturday, 8:00 AM–5:00 PM",
};

export const schedules: PublicScheduleConfig[] = [];
const offsets = [-14, -10, -7, -4, -2, -1, ...Array.from({ length: 15 }, (_, index) => index)];
for (const offset of offsets) {
  for (const slot of [0, 1, 2, 3]) {
    const boat = boats[slot === 3 ? 2 : slot % 2];
    const cargo = boat.type === "cargo";
    const routeFareId = cargo ? "demo-fare-3" : slot % 2 === 1 ? "demo-fare-2" : "demo-fare-1";
    const destination = slot % 2 === 1 && !cargo ? "Navotas" : "Janosa";
    const departureTime = ["08:00", "13:00", "23:50", "16:30"][slot];
    const arrivalTime = ["08:40", "13:45", "23:59", "17:10"][slot];
    const departure = demoTimestamp(offset, departureTime);
    const arrival = demoTimestamp(offset, arrivalTime);
    schedules.push({
      id: `demo-schedule-${offset}-${slot}`, route: `Binangonan Port – ${destination}`,
      boatId: boat.id, boatName: boat.name, boatType: boat.type, operatorId: "101", operatorName: operator.fullName,
      routeFareId, origin: "Binangonan Port", destination, capacity: boat.capacity, availableSeats: cargo ? null : boat.capacity,
      cargoBooked: false, cargoBookingStatus: null, departure, arrival, departureDatetime: departure, arrivalDatetime: arrival,
      frequency: "Daily sample schedule", notes: "Fictional portfolio sample. No real travel reservation.",
      tripStatus: offset < 0 ? "completed" : offset === 0 && slot === 0 ? "completed" : offset === 0 && slot === 1 ? "boarding" : "preparing",
      tripStatusReason: null, tripStatusEta: null,
    });
  }
}

const sampleReceipt = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="460"><rect width="360" height="460" fill="#eff6ff"/><text x="180" y="70" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#173658">SAMPLE RECEIPT</text><text x="180" y="125" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#173658">Fictional portfolio data</text><text x="180" y="200" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#173658">PHP 100.00</text><text x="180" y="265" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#173658">DEMO-REFERENCE-001</text><text x="180" y="355" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#173658">No money was transferred</text></svg>')}`;

export const personBookings: PersonBookingRecord[] = [];
export const cargoBookings: CargoBookingRecord[] = [];
export const bookingOwners = new Map<string, number>();

function addPassenger(scheduleId: string, paymentStatus: PersonBookingRecord["paymentStatus"], owner: number, index: number) {
  const schedule = schedules.find((entry) => entry.id === scheduleId)!;
  const fare = fares.find((entry) => entry.id === schedule.routeFareId)!;
  const id = `DEMO-PAX-${String(index).padStart(4, "0")}`;
  const count = index % 3 === 0 ? 3 : 2;
  const farePerPassenger = fare.baseFare! * (1 + ((fare.distanceKm - 1) * fare.percentagePerKilometer!) / 100);
  const completed = schedule.tripStatus === "completed";
  personBookings.push({
    id, passengerName: owner === 1 ? passenger.fullName! : ["Jamie Sample", "Sam Example", "Riley Demo", "Noah Sample"][index % 4],
    passengerPhone: owner === 1 ? passenger.phone! : "09000000002", numberOfPassengers: count, seniorCitizenCount: 0, pwdCount: 0,
    farePerPassenger, discountAmount: 0, origin: schedule.origin!, destination: schedule.destination!, date: schedule.departureDatetime!.slice(0, 10),
    time: schedule.departureDatetime!.slice(11, 16), boatId: schedule.boatId!, scheduleId, scheduleLabel: `${schedule.boatName} · ${schedule.departureDatetime!.slice(11, 16)}`,
    fareId: fare.id, fareName: fare.fareName, status: completed ? "completed" : paymentStatus === "verified" ? "confirmed" : paymentStatus === "rejected" ? "payment_rejected" : paymentStatus === "for_cash_collection" ? "for_cash_collection" : "for_verification",
    totalAmount: count * farePerPassenger, paymentStatus, paymentMethod: paymentStatus === "for_cash_collection" ? "cash" : "gcash",
    paymentReference: paymentStatus === "for_cash_collection" ? undefined : `DEMO-REF-${index}`, paymentProofImageUrl: paymentStatus === "for_cash_collection" ? undefined : sampleReceipt,
    paymentNotes: paymentStatus === "rejected" ? "Sample rejection: reference unreadable. Add a new sample proof to try again." : undefined,
    verifiedBy: paymentStatus === "verified" ? operator.fullName : undefined, verifiedAt: paymentStatus === "verified" ? demoTimestamp(-1, "10:00") : undefined,
    createdAt: demoTimestamp(completed ? -15 : -1, "09:00"), updatedAt: demoTimestamp(0, "07:00"),
  });
  bookingOwners.set(id, owner);
}

let passengerIndex = 0;
for (const offset of [-14, -10, -7, -4, -2, -1, 0, 1, 2, 3, 5]) {
  for (const slot of [0, 1, 2]) {
    const status: PersonBookingRecord["paymentStatus"] = offset < 0 ? "verified" : slot === 0 ? "verified" : slot === 1 ? "for_verification" : "for_cash_collection";
    addPassenger(`demo-schedule-${offset}-${slot}`, status, slot === 0 || offset === 1 ? 1 : 2, ++passengerIndex);
  }
}
addPassenger("demo-schedule-2-1", "rejected", 1, ++passengerIndex);

let cargoIndex = 0;
for (const offset of [-10, -4, -1, 0, 1, 3]) {
  const schedule = schedules.find((entry) => entry.id === `demo-schedule-${offset}-3`)!;
  const id = `DEMO-CARGO-${String(++cargoIndex).padStart(4, "0")}`;
  const verified = offset < 0 || offset === 1;
  const paymentStatus = verified ? "verified" : offset === 0 ? "for_verification" : "for_cash_collection";
  cargoBookings.push({
    id, senderName: offset === 0 || offset === 1 ? passenger.fullName! : "Jamie Sample", senderPhone: "09000000001",
    receiverName: "Taylor Example", receiverPhone: "09000000003", cargoDescription: ["Sample school supplies", "Boxed dry goods", "Sealed household items"][cargoIndex % 3], weight: 75,
    origin: schedule.origin!, destination: schedule.destination!, date: schedule.departureDatetime!.slice(0, 10), boatId: schedule.boatId!, scheduleId: schedule.id,
    scheduleLabel: `${schedule.boatName} · 16:30`, fareId: "demo-fare-3", fareName: fares[2].fareName, status: offset < 0 ? "completed" : verified ? "confirmed" : paymentStatus === "for_cash_collection" ? "for_cash_collection" : "for_verification",
    totalAmount: 450, paymentStatus, paymentMethod: paymentStatus === "for_cash_collection" ? "cash" : "gcash", paymentReference: `DEMO-CARGO-REF-${cargoIndex}`,
    paymentProofImageUrl: paymentStatus === "for_cash_collection" ? undefined : sampleReceipt,
    verifiedBy: verified ? operator.fullName : undefined, verifiedAt: verified ? demoTimestamp(-1, "09:00") : undefined,
    createdAt: demoTimestamp(offset < 0 ? offset - 1 : -1), updatedAt: demoTimestamp(0),
  });
  bookingOwners.set(id, offset <= 1 ? 1 : 2);
}

export const notifications: SystemNotification[] = [
  { id: "demo-note-1", type: "booking", title: "Your sample trip is confirmed", message: "Your fictional Janosa booking is ready to preview. No actual reservation has been made.", priority: "normal", isRead: false, userId: "1", createdAt: demoTimestamp(0, "08:00") },
  { id: "demo-note-2", type: "payment", title: "Sample payment awaiting review", message: "Open Payments to inspect a demonstration GCash proof and payment status.", priority: "normal", isRead: false, userId: "1", createdAt: demoTimestamp(-1, "16:00") },
  { id: "demo-note-3", type: "announcement", title: "Welcome to the portfolio demo", message: "All people, trips, receipts, and weather in this showcase are fictional. Changes reset when the page reloads.", priority: "normal", isRead: false, userId: null, createdAt: demoTimestamp(-2, "09:00") },
  { id: "demo-note-4", type: "payment", title: "Sample payments need verification", message: "Open Payment Verification to approve or reject a fictional payment in browser memory.", priority: "high", isRead: false, userId: "101", createdAt: demoTimestamp(0, "07:00") },
  { id: "demo-note-5", type: "schedule", title: "Sample boat is ready for boarding", message: "Talim Voyager has a demonstration passenger trip ready to inspect in Trip Execution.", priority: "normal", isRead: false, userId: "101", createdAt: demoTimestamp(0, "08:30") },
];

export function refreshAvailability() {
  const blocked = new Set(["cancelled", "payment_rejected", "affected_by_cancellation"]);
  for (const schedule of schedules) {
    if (schedule.boatType === "cargo") {
      const activeCargo = cargoBookings.find((entry) => entry.scheduleId === schedule.id && !blocked.has(entry.status));
      schedule.cargoBooked = Boolean(activeCargo);
      schedule.cargoBookingStatus = activeCargo?.status ?? null;
    } else {
      const seats = personBookings.filter((entry) => entry.scheduleId === schedule.id && !blocked.has(entry.status))
        .reduce((sum, entry) => sum + entry.numberOfPassengers, 0);
      schedule.availableSeats = Math.max(0, (schedule.capacity ?? 0) - seats);
    }
  }
  for (const boat of boats) {
    const next = schedules.find((entry) => entry.boatId === boat.id && entry.departureDatetime && new Date(entry.departureDatetime).getTime() > Date.now());
    const records = personBookings.filter((entry) => entry.scheduleId === next?.id && !blocked.has(entry.status));
    boat.confirmedSeats = records.filter((entry) => entry.paymentStatus === "verified").reduce((sum, entry) => sum + entry.numberOfPassengers, 0);
    boat.pendingSeats = records.filter((entry) => entry.paymentStatus !== "verified").reduce((sum, entry) => sum + entry.numberOfPassengers, 0);
    boat.availableSeats = next?.availableSeats ?? boat.capacity;
  }
}

refreshAvailability();
