import type { Boat, BoatOperator, BookingStatus, CargoBooking, Notification, PersonBooking, User } from '@/types/models';
import type { BarangayConfigDTO, ContactConfigDTO, FareMatrixConfigDTO, ScheduleConfigDTO } from '@/api/settings';

// All people, accounts, registrations, payments and contact details below are
// invented for the portfolio. No records are imported from the original app.
export const demoToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const demoDate = (offset = 0) => {
  const day = new Date(`${demoToday}T12:00:00+08:00`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
};
const timestamp = (offset = 0, time = '08:00') => `${demoDate(offset)}T${time}:00+08:00`;
const emailFor = (name: string) => `${name.toLowerCase().replaceAll(' ', '.')}@isla-demo.example`;

export const demoUser: User = {
  id: '1', username: 'Demo administrator', email: 'admin@isla-demo.example',
  role: 'super_admin', status: 'active', firstName: 'Demo', lastName: 'Administrator',
  createdAt: timestamp(-90), isOnline: true, mustChangePassword: false,
};

const operatorNames = ['Marco Isla', 'Daniel Bayani', 'Paolo Amihan', 'Nico Dalisay', 'Elias Sikat', 'Gabriel Alon'];
export const seedOperators: BoatOperator[] = operatorNames.map((name, index) => ({
  id: String(index + 101), username: `demo.operator.${index + 1}`, name,
  email: emailFor(name), phone: `0900 000 01${String(index + 1).padStart(2, '0')}`,
  licenseNumber: `DEMO-LIC-${String(index + 1).padStart(4, '0')}`,
  operatorType: index >= 4 ? 'cargo' : 'banca', birthday: `${1980 + index}-04-12`,
  boats: [], status: index === 5 ? 'inactive' : 'active', isOnline: index < 3,
  createdAt: timestamp(-100 + index), lastLoginAt: timestamp(-1), lastSeenAt: timestamp(),
  mustChangePassword: false,
}));

export const seedBarangays: BarangayConfigDTO[] = [
  ['Talim Island', 'Island zone', 3200], ['Binangonan', 'Mainland zone', 8200],
  ['Cardona', 'Mainland zone', 6100], ['Navotas', 'Island zone', 2100],
  ['Ticub', 'Island zone', 1400], ['Janosa', 'Island zone', 1800],
].map(([name, zone, population], index) => ({
  id: `barangay-${index + 1}`, barangayName: String(name), zone: String(zone), population: Number(population),
  notes: 'Illustrative service area for the portfolio demonstration.', createdAt: timestamp(-80),
}));

const routes = [
  ['Binangonan', 'Talim Island', 8, 75], ['Cardona', 'Talim Island', 6, 65],
  ['Binangonan', 'Navotas', 10, 85], ['Cardona', 'Ticub', 7, 70],
];
export const seedFares: FareMatrixConfigDTO[] = routes.flatMap(([origin, destination, distance, base], index) => ([
  { id: `fare-${index + 1}`, fareName: `${origin} - ${destination} passenger`, route: `${origin} - ${destination}`,
    origin, destination, distanceKm: Number(distance), type: 'commuter' as const, baseFare: Number(base),
    percentagePerKilometer: 0, isActive: true, createdAt: timestamp(-60) },
  { id: `cargo-fare-${index + 1}`, fareName: `${origin} - ${destination} cargo`, route: `${origin} - ${destination}`,
    origin, destination, distanceKm: Number(distance), type: 'cargo' as const, rentalFare: 1200 + index * 250,
    weightLimitKg: 800 + index * 200, isActive: true, createdAt: timestamp(-60) },
]));

const boatNames = ['Isla Sunrise', 'Amihan Express', 'Laguna Pearl', 'Talim Voyager', 'Blue Horizon', 'Isla Cargo One', 'Bayani Cargo', 'Lake Breeze'];
export const seedBoats: Boat[] = boatNames.map((name, index) => {
  const operator = seedOperators[index === 5 ? 4 : index === 6 ? 5 : index % 4];
  const routeIndex = index % routes.length;
  const isCargo = index === 5 || index === 6;
  const capacity = isCargo ? 1000 : [32, 28, 40, 24, 36, 0, 0, 30][index];
  const confirmedSeats = isCargo ? 0 : [12, 8, 22, 6, 17, 0, 0, 0][index];
  return {
    id: `boat-${index + 1}`, name, registrationNumber: `DEMO-MB-${String(index + 1).padStart(3, '0')}`,
    type: isCargo ? 'cargo' : 'banca', section: isCargo ? 'cargo' : index === 4 ? 'cluster' : 'banca',
    clusterName: index === 4 ? 'Island passenger cluster' : undefined, capacity,
    status: index === 7 ? 'maintenance' : index === 6 ? 'coding' : 'registered',
    operatorId: operator.id, operatorName: operator.name, operatorIds: [operator.id], operatorNames: [operator.name],
    barangay: String(routes[routeIndex][1]), routeNames: [`${routes[routeIndex][0]} - ${routes[routeIndex][1]}`],
    bancaTripStatus: index === 7 ? 'maintenance' : index === 0 ? 'boarding' : index === 2 ? 'in_transit' : 'preparing',
    cargoTripStatus: index === 5 ? 'out_for_delivery' : 'preparing',
    confirmedSeats, pendingSeats: isCargo ? 0 : 2, availableSeats: capacity - confirmedSeats - (isCargo ? 0 : 2),
    createdAt: timestamp(-90 + index), lastMaintenance: demoDate(-30), nextMaintenance: demoDate(30),
  };
});

export const seedSchedules: ScheduleConfigDTO[] = Array.from({ length: 22 }, (_, dayIndex) => dayIndex - 6).flatMap((offset) =>
  seedBoats.filter(boat => boat.status === 'registered').flatMap((boat, boatIndex) => {
    const routeIndex = (boatIndex === 5 ? 0 : boatIndex) % routes.length;
    const [origin, destination] = routes[routeIndex];
    const isCargo = boat.type === 'cargo';
    return [0, 1].map((tripIndex) => {
      const departureHour = 8 + boatIndex + tripIndex * 6;
      const departure = `${String(departureHour).padStart(2, '0')}:00`;
      const arrival = `${String(departureHour + 1).padStart(2, '0')}:00`;
      const from = String(tripIndex ? destination : origin);
      const to = String(tripIndex ? origin : destination);
      return {
        id: `schedule-${offset + 6}-${boatIndex + 1}-${tripIndex}`, boatId: boat.id, boatName: boat.name,
        boatType: boat.type, operatorId: boat.operatorId, operatorName: boat.operatorName,
        routeFareId: `${isCargo ? 'cargo-fare' : 'fare'}-${routeIndex + 1}`,
        route: `${from} - ${to}`, origin: from, destination: to,
        capacity: boat.capacity, availableSeats: offset < 0 ? 0 : boat.availableSeats,
        cargoBooked: isCargo && offset === 0 && tripIndex === 0,
        cargoBookingStatus: isCargo && offset === 0 ? 'confirmed' : undefined,
        departure, arrival, departureDatetime: timestamp(offset, departure), arrivalDatetime: timestamp(offset, arrival),
        frequency: 'Daily', selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        recurrenceGroupId: `demo-service-${boatIndex}-${tripIndex}`, validUntil: demoDate(15),
        tripStatus: offset < 0 ? 'completed' : offset === 0 && boatIndex === 0 && tripIndex === 0 ? 'boarding' : 'preparing',
        notes: 'Fictional timetable. This is a portfolio demonstration, not a travel service.',
      };
    });
  }),
);

const passengerNames = ['Mia Rivera', 'Luis Estrella', 'Sofia Bayani', 'Andrei Luntian', 'Clara Alon', 'Rafael Isla', 'Isabel Amihan', 'Noah Dalisay', 'Elena Silang', 'Enzo Tala', 'Bianca Sikat', 'Mateo Diwa', 'Lara Liwanag', 'Diego Hiraya', 'Nina Marikit', 'Adrian Sinag', 'Lea Mayumi', 'Lucas Balangay'];
const bookingStatuses: BookingStatus[] = ['confirmed', 'for_verification', 'for_cash_collection', 'confirmed', 'pending_payment', 'completed', 'confirmed', 'cancelled', 'for_verification', 'confirmed', 'pending_payment', 'confirmed', 'confirmed', 'payment_rejected', 'confirmed', 'for_cash_collection', 'completed', 'confirmed'];

// The receipt is generated locally and clearly marked as a sample. No uploads
// or original payment proof images are copied into this showcase.
export const sampleReceipt = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600"><rect width="480" height="600" fill="#f1f5f9"/><rect x="32" y="32" width="416" height="536" rx="20" fill="white"/><g text-anchor="middle" font-family="Arial" fill="#0f172a"><text x="240" y="100" font-size="28" font-weight="bold">ISLA SAKAY</text><text x="240" y="145" font-size="18">FICTIONAL PAYMENT SAMPLE</text><text x="240" y="235" font-size="42">PHP 150.00</text><text x="240" y="305" font-size="18">Demo reference: SAMPLE-001</text><text x="240" y="365" font-size="18">No money was transferred.</text><text x="240" y="465" font-size="16">For portfolio display only</text></g></svg>')}`;

export const seedPeople: PersonBooking[] = passengerNames.map((name, index) => {
  const offset = index === 5 || index === 16 ? -1 : Math.floor(index / 6);
  const options = seedSchedules.filter(schedule => schedule.departureDatetime?.startsWith(demoDate(offset)) && schedule.boatType !== 'cargo');
  const schedule = options[index % options.length];
  const status = bookingStatuses[index];
  const passengerCount = [2, 1, 3, 2, 1, 4][index % 6];
  const fare = seedFares.find(item => item.id === schedule.routeFareId)!;
  return {
    id: `IS-P-${String(index + 1001)}`, passengerName: name, passengerEmail: emailFor(name),
    passengerPhone: `0900 000 02${String(index + 1).padStart(2, '0')}`, numberOfPassengers: passengerCount,
    seniorCitizenCount: index === 3 ? 1 : 0, pwdCount: 0, farePerPassenger: fare.baseFare,
    discountAmount: index === 3 ? Number(fare.baseFare) * 0.2 : 0,
    origin: schedule.origin!, destination: schedule.destination!, date: demoDate(offset), time: schedule.departure,
    boatId: schedule.boatId, scheduleId: schedule.id, scheduleLabel: `${schedule.boatName} • ${schedule.departure}`,
    fareId: fare.id, fareName: fare.fareName, status,
    totalAmount: Number(fare.baseFare) * passengerCount - (index === 3 ? Number(fare.baseFare) * 0.2 : 0),
    paymentStatus: status === 'confirmed' || status === 'completed' ? 'verified' : status === 'for_verification' ? 'for_verification' : status === 'for_cash_collection' ? 'for_cash_collection' : status === 'payment_rejected' ? 'rejected' : 'pending',
    paymentMethod: index % 3 === 0 ? 'cash' : 'gcash',
    paymentReference: index % 3 === 0 ? undefined : `DEMO-GCASH-P${1001 + index}`,
    paymentProofImageUrl: status === 'for_verification' ? sampleReceipt : undefined,
    paymentNotes: status === 'payment_rejected' ? 'Demo: sample receipt requires a clearer reference.' : undefined,
    verifiedBy: ['confirmed', 'completed', 'payment_rejected'].includes(status) ? 'demo.verifier' : undefined,
    verifiedAt: ['confirmed', 'completed', 'payment_rejected'].includes(status) ? new Date(Date.now() - (index * 50 + 5) * 60_000).toISOString() : undefined,
    createdAt: new Date(Date.now() - index * 47 * 60_000).toISOString(),
  };
});

export const seedCargo: CargoBooking[] = ['Market produce crates', 'School learning materials', 'Hardware supplies', 'Packaged groceries', 'Fishing equipment', 'Bottled drinking water', 'Community event supplies', 'Home essentials'].map((description, index) => {
  const offset = index === 6 ? -1 : Math.floor(index / 3);
  const schedule = seedSchedules.find(item => item.boatType === 'cargo' && item.departureDatetime?.startsWith(demoDate(offset)) && item.departure === '13:00')!;
  const status: BookingStatus = ['confirmed', 'for_verification', 'for_cash_collection', 'pending_payment', 'confirmed', 'cancelled', 'completed', 'for_verification'][index] as BookingStatus;
  return {
    id: `IS-C-${index + 2001}`, senderName: passengerNames[index + 3], senderPhone: `0900 000 03${String(index + 1).padStart(2, '0')}`,
    receiverName: passengerNames[index + 9], receiverPhone: `0900 000 04${String(index + 1).padStart(2, '0')}`,
    cargoDescription: description, weight: [180, 85, 320, 140, 65, 250, 110, 95][index], dimensions: '120 × 80 × 60 cm',
    origin: schedule.origin!, destination: schedule.destination!, date: demoDate(offset), boatId: schedule.boatId,
    scheduleId: schedule.id, scheduleLabel: `${schedule.boatName} • ${schedule.departure}`, fareId: schedule.routeFareId,
    fareName: 'Island cargo service', status, totalAmount: 1450,
    paymentStatus: status === 'confirmed' || status === 'completed' ? 'verified' : status === 'for_verification' ? 'for_verification' : status === 'for_cash_collection' ? 'for_cash_collection' : 'pending',
    paymentMethod: index % 2 ? 'gcash' : 'cash', paymentReference: index % 2 ? `DEMO-GCASH-C${2001 + index}` : undefined,
    paymentProofImageUrl: status === 'for_verification' ? sampleReceipt : undefined,
    verifiedBy: status === 'confirmed' || status === 'completed' ? 'demo.verifier' : undefined,
    verifiedAt: status === 'confirmed' || status === 'completed' ? new Date(Date.now() - (index * 60 + 8) * 60_000).toISOString() : undefined,
    createdAt: new Date(Date.now() - (index * 53 + 10) * 60_000).toISOString(),
  };
});

export const seedNotifications: Notification[] = [
  { id: 'notice-1', type: 'system', title: 'Welcome to the Isla Sakay demo', message: 'Explore the original interface with fictional data. Changes stay in this tab and reset on reload.', priority: 'low', isRead: false, createdAt: new Date().toISOString() },
  { id: 'notice-2', type: 'weather', title: 'Sample weather advisory', message: 'Illustrative advisory: operators should monitor lake conditions before departure. This is not live weather information.', priority: 'high', isRead: false, createdAt: timestamp(0, '07:00') },
  { id: 'notice-3', type: 'coast_guard', title: 'Sample safety reminder', message: 'Demo notice: check passenger manifests, life jackets, and vessel readiness before boarding. Not an official advisory.', priority: 'medium', isRead: false, createdAt: timestamp(0, '06:30') },
  { id: 'notice-4', type: 'payment', title: 'Sample payments awaiting review', message: 'Four fictional transfer receipts are ready for the verification workflow.', priority: 'medium', isRead: false, createdAt: timestamp(0, '08:15') },
  { id: 'notice-5', type: 'booking', title: 'Cargo booking created', message: 'Sample booking IS-C-2001 has been assigned to Isla Cargo One.', priority: 'low', isRead: true, createdAt: timestamp(-1, '15:30') },
  { id: 'notice-6', type: 'alert', title: 'Maintenance scheduled', message: 'Lake Breeze is unavailable during its sample maintenance window.', priority: 'medium', isRead: true, createdAt: timestamp(-1, '10:00') },
  { id: 'notice-7', type: 'system', title: 'Login Activity', message: 'Demo administrator opened this fictional admin session. No actual account login is required.', priority: 'low', isRead: true, createdAt: new Date(Date.now() - 20 * 60_000).toISOString() },
  { id: 'notice-8', type: 'system', title: 'Activity Alert', message: 'demo.dispatch updated the fictional island service timetable.', priority: 'low', isRead: true, createdAt: new Date(Date.now() - 60 * 60_000).toISOString() },
];

export const seedContact: ContactConfigDTO = { id: 'demo-contact', email: 'hello@isla-demo.example', phone: '0900 000 0000', officeAddress: 'Sample Port Office, Binangonan, Rizal (portfolio demo)', officeHours: 'Monday – Saturday, 6:00 AM – 6:00 PM' };

export const createDemoState = () => structuredClone({
  people: seedPeople, cargo: seedCargo, boats: seedBoats, operators: seedOperators,
  barangays: seedBarangays, schedules: seedSchedules, fares: seedFares,
  notifications: seedNotifications, contact: seedContact,
  admins: ['demo.port.manager', 'demo.dispatch', 'demo.verifier'].map((username, index) => ({
    id: String(index + 11), adminId: index + 11, username, email: `${username}@isla-demo.example`,
    fullName: ['Demo Port Manager', 'Demo Dispatch Officer', 'Demo Payment Reviewer'][index],
    isActive: index !== 2, createdAt: timestamp(-60 + index), mustChangePassword: false,
    isOnline: index === 0, lastLoginAt: timestamp(-1), lastSeenAt: timestamp(),
  })),
  appUsers: passengerNames.slice(0, 10).map((name, index) => ({
    id: String(index + 501), userId: index + 501, googleSub: `fictional-demo-user-${index + 1}`,
    email: emailFor(name), fullName: name, firstName: name.split(' ')[0], lastName: name.split(' ')[1],
    nickname: name.split(' ')[0], phone: `0900 000 02${String(index + 1).padStart(2, '0')}`,
    isActive: index !== 8, isOnline: index < 3, createdAt: timestamp(-45 + index), lastLoginAt: timestamp(-1), lastSeenAt: timestamp(),
  })),
  users: [demoUser],
  history: [
    { id: 'history-1', username: 'Demo administrator', action: 'create', moduleName: 'booking', entityName: 'booking', information: 'Created fictional passenger booking IS-P-1001 for the portfolio demonstration.', createdAt: timestamp(0, '08:05') },
    { id: 'history-2', username: 'demo.port.manager', action: 'update', moduleName: 'boat', entityName: 'boat', information: 'Set the sample boarding status for Isla Sunrise.', createdAt: timestamp(0, '07:55') },
    { id: 'history-3', username: 'demo.dispatch', action: 'create', moduleName: 'settings', entityName: 'schedule', information: 'Added the fictional island morning timetable.', createdAt: timestamp(-1, '14:00') },
  ],
  accountPreferences: { theme: 'dark' as 'dark' | 'light', notificationSoundEnabled: false, notificationSoundVolume: 0.3 },
  clientPreferences: { theme: 'dark' as 'dark' | 'light', cookieConsent: 'accepted' as 'accepted' | 'declined' | null, rememberedUsername: null as string | null },
});
