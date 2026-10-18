import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { createDemoState, demoToday, demoUser } from './seed';

type Row = Record<string, unknown>;
type Params = Record<string, unknown>;
const state = createDemoState();
let nextId = 3000;
const now = () => new Date().toISOString();
const text = (value: unknown) => value == null ? '' : String(value);
const asRows = (rows: unknown): Row[] => rows as Row[];

class DemoError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const bodyOf = (config: InternalAxiosRequestConfig): Row => {
  if (!config.data) return {};
  if (typeof config.data === 'string') {
    try { return JSON.parse(config.data) as Row; } catch { throw new DemoError('The demo request could not be read.'); }
  }
  if (typeof config.data === 'object' && !Array.isArray(config.data)) return config.data as Row;
  throw new DemoError('The demo expects an object as request data.');
};

const filterRows = (rows: Row[], params: Params, dateField = 'date'): Row[] => {
  const query = text(params.q ?? params.search ?? params.query).trim().toLowerCase();
  const status = text(params.status);
  const allowedBoatTypes = text(params.boatTypes).split(',').filter(Boolean);
  return rows.filter(row => {
    if (query && !Object.values(row).some(value => text(value).toLowerCase().includes(query))) return false;
    if (status && status !== 'all' && status !== 'All') {
      if (dateField === 'departureDatetime' && ['active', 'upcoming', 'in_progress', 'completed'].includes(status)) {
        const departure = Date.parse(text(row.departureDatetime));
        const arrival = Date.parse(text(row.arrivalDatetime));
        const runtime = !Number.isFinite(departure) || !Number.isFinite(arrival) ? 'invalid' : Date.now() >= arrival ? 'completed' : Date.now() >= departure ? 'in_progress' : 'upcoming';
        if (status === 'active' ? !['upcoming', 'in_progress'].includes(runtime) || ['cancelled', 'maintenance'].includes(text(row.tripStatus)) : runtime !== status) return false;
      } else if (text(row.tripStatus ?? row.status) !== status) return false;
    }
    if (params.type && row.type !== params.type) return false;
    if (params.section && row.section !== params.section) return false;
    if (params.role && row.role !== params.role) return false;
    if (params.boatId && row.boatId !== params.boatId) return false;
    if (params.operatorId && row.operatorId !== params.operatorId) return false;
    if (allowedBoatTypes.length && !allowedBoatTypes.includes(text(row.boatType))) return false;
    const day = text(row[dateField]).slice(0, 10);
    if (params.from && day && day < text(params.from).slice(0, 10)) return false;
    if (params.to && day && day > text(params.to).slice(0, 10)) return false;
    if (params.selectedDate && day !== text(params.selectedDate)) return false;
    return true;
  });
};

const paged = (rows: Row[], params: Params) => {
  const size = Math.max(1, Math.min(100, Number(params.size) || 10));
  const page = Math.max(0, Number(params.page) || 0);
  return { items: rows.slice(page * size, (page + 1) * size), page, size, totalItems: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / size)) };
};

const lookup = (rows: Row[], id: string): Row => {
  const row = rows.find(item => String(item.id) === id);
  if (!row) throw new DemoError('This sample record could not be found. Reload to restore the demo data.', 404);
  return row;
};

const noteAction = (action: string, moduleName: string, entityName: string) => {
  const modules: Record<string, string> = { bookings: 'booking', payments: 'booking', boats: 'boat', schedules: 'settings', fares: 'settings', barangays: 'settings', notifications: 'notification', admins: 'admin', 'boat-operators': 'operator' };
  const module = modules[moduleName.toLowerCase()] ?? moduleName.toLowerCase();
  const entity = ['schedules', 'fares', 'barangays'].includes(moduleName.toLowerCase()) ? moduleName.toLowerCase().replace(/s$/, '') : module;
  state.history.unshift({ id: `history-${++nextId}`, username: demoUser.username, action: action.toLowerCase().replace(/d$/, ''), moduleName: module, entityName: entity,
    information: `${action} ${entityName} in this local portfolio demonstration. No external changes were made.`, createdAt: now() });
};

const safeBody = (data: Row): Row => Object.fromEntries(Object.entries(data).filter(([key]) => !['password', 'currentPassword', 'newPassword'].includes(key)));

const collection = (rows: Row[], path: string, base: string, method: string, data: Row, params: Params, defaults: () => Row = () => ({}), dateField = 'date'): unknown => {
  const suffix = path.slice(base.length).replace(/^\//, '');
  if (suffix === '' || suffix === 'paged') {
    if (method === 'get') {
      const result = filterRows(rows, params, dateField);
      return suffix === 'paged' ? paged(result, params) : result;
    }
    if (method === 'post' && !suffix) {
      const row: Row = { ...defaults(), ...safeBody(data), id: text(data.id) || `demo-${++nextId}`, createdAt: now() };
      rows.unshift(row); noteAction('Created', base.split('/').pop()!, text(row.name ?? row.fareName ?? row.barangayName ?? row.id));
      return row;
    }
  }
  const [id, action] = suffix.split('/');
  if (!id || suffix === 'paged') throw new DemoError('This operation is unavailable in the local demo.', 405);
  const row = lookup(rows, decodeURIComponent(id));
  if (method === 'get' && !action) return row;
  if ((method === 'put' || method === 'patch') && !action) {
    Object.assign(row, safeBody(data), { id: row.id, updatedAt: now() });
    noteAction('Updated', base.split('/').pop()!, text(row.name ?? row.id)); return row;
  }
  if (method === 'delete' && !action) {
    rows.splice(rows.indexOf(row), 1); noteAction('Deleted', base.split('/').pop()!, text(row.name ?? row.id));
    return { message: 'Removed from this demo tab only.' };
  }
  if (method === 'patch' && action === 'status') {
    row.status = data.status; row.updatedAt = now(); noteAction('Updated', base.split('/').pop()!, text(row.id)); return row;
  }
  if (method === 'patch' && action === 'toggle') { row.isActive = !row.isActive; row.updatedAt = now(); return row; }
  throw new DemoError('This operation is unavailable in the local demo.', 405);
};

const operatorResponse = (row: Row) => ({
  ...row, operatorId: Number(row.id), fullName: row.name, contactNumber: row.phone,
  isActive: row.status === 'active',
});

const hydrateSchedule = (data: Row): Row => {
  const boat = state.boats.find(item => item.id === data.boatId);
  const fare = state.fares.find(item => item.id === data.routeFareId);
  const parts = text(data.route ?? fare?.route).split(/\s+(?:-|→|->)\s+/);
  const departureDatetime = text(data.departureDatetime);
  const arrivalDatetime = text(data.arrivalDatetime);
  return {
    ...data, boatName: boat?.name ?? data.boatName, boatType: boat?.type ?? data.boatType,
    operatorId: boat?.operatorId ?? data.operatorId, operatorName: boat?.operatorName ?? data.operatorName,
    capacity: boat?.capacity ?? data.capacity, availableSeats: boat?.availableSeats ?? data.availableSeats,
    origin: data.origin ?? parts[0], destination: data.destination ?? parts[1],
    route: data.route ?? fare?.route, tripStatus: data.tripStatus ?? 'preparing',
    departure: data.departure ?? departureDatetime.slice(11, 16), arrival: data.arrival ?? arrivalDatetime.slice(11, 16),
  };
};

const createBooking = (kind: 'person' | 'cargo', data: Row) => {
  const schedule = state.schedules.find(item => item.id === data.scheduleId);
  if (!schedule) throw new DemoError('Choose an available sample schedule first.');
  const amount = Number(data.totalAmount);
  if (!(amount > 0)) throw new DemoError('Enter a positive sample fare amount.');
  if (kind === 'person' && Number(data.numberOfPassengers) > Number(schedule.availableSeats ?? schedule.capacity)) throw new DemoError('This sample schedule does not have enough seats.');
  if (kind === 'cargo' && Number(data.weight) > Number(schedule.capacity)) throw new DemoError('This sample cargo exceeds the vessel weight limit.');
  const cash = data.paymentMethod !== 'gcash';
  const id = `IS-${kind === 'person' ? 'P' : 'C'}-${++nextId}`;
  const booking = {
    ...safeBody(data), id, passengerPhone: data.phone ?? data.passengerPhone,
    origin: schedule.origin, destination: schedule.destination, date: schedule.departureDatetime?.slice(0, 10),
    time: schedule.departure, boatId: schedule.boatId, scheduleLabel: `${schedule.boatName} • ${schedule.departure}`,
    fareId: schedule.routeFareId, fareName: state.fares.find(item => item.id === schedule.routeFareId)?.fareName,
    status: cash ? 'for_cash_collection' : 'for_verification', paymentStatus: cash ? 'for_cash_collection' : 'for_verification',
    paymentMethod: cash ? 'cash' : 'gcash', totalAmount: amount, createdAt: now(),
  };
  const rows = kind === 'person' ? asRows(state.people) : asRows(state.cargo);
  rows.unshift(booking);
  if (kind === 'person') schedule.availableSeats = Math.max(0, Number(schedule.availableSeats ?? schedule.capacity) - Number(data.numberOfPassengers));
  else { schedule.cargoBooked = true; schedule.cargoBookingStatus = text(booking.status); }
  noteAction('Created', 'Bookings', id);
  return booking;
};

const routeRequest = (path: string, method: string, data: Row, params: Params): unknown => {
  if (path === '/auth/me') return demoUser;
  if (path === '/auth/introspect') return { active: true, principalType: 'SUPERADMIN', principalId: 1, username: demoUser.username, sessionId: 'local-demo-session' };
  if (path === '/auth/login' || path === '/auth/refresh') return {
    user: demoUser, token: 'portfolio-demo-token', accessToken: 'portfolio-demo-token', tokenType: 'Bearer',
    accessExpiresAt: new Date(Date.now() + 86_400_000).toISOString(), refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    sessionId: 'local-demo-session', principalType: 'SUPERADMIN', principalId: 1, username: demoUser.username,
  };
  if (path === '/auth/logout' || path.endsWith('/change-password')) return { message: 'Demo only. No account password was changed.' };
  if (path === '/superadmins/login') return { superAdminId: 1, username: demoUser.username, email: demoUser.email, isActive: true, createdAt: demoUser.createdAt };
  if (path === '/superadmins' || path === '/superadmins/1') return path.endsWith('/1') ? { ...demoUser, superAdminId: 1, isActive: true } : [{ ...demoUser, superAdminId: 1, isActive: true }];

  if (path === '/preferences/client') {
    if (method === 'patch' || method === 'put') Object.assign(state.clientPreferences, safeBody(data));
    return state.clientPreferences;
  }
  if (path === '/preferences/account') {
    if (method === 'patch' || method === 'put') Object.assign(state.accountPreferences, safeBody(data));
    return state.accountPreferences;
  }
  if (path === '/settings/contact') {
    if (method === 'put' || method === 'patch') Object.assign(state.contact, safeBody(data));
    return state.contact;
  }
  if (path === '/settings/boat-statuses') return Object.fromEntries(state.boats.map(boat => [boat.id, boat.type === 'cargo' ? boat.cargoTripStatus ?? 'preparing' : boat.bancaTripStatus ?? 'preparing']));

  if (path === '/settings/schedules/usage/fare-counts') {
    const counts: Record<string, number> = {};
    state.schedules.forEach(schedule => { if (schedule.routeFareId) counts[schedule.routeFareId] = (counts[schedule.routeFareId] ?? 0) + 1; });
    return counts;
  }
  if (path === '/settings/schedules/usage/barangay-counts') {
    return Object.fromEntries(state.barangays.map(barangay => [barangay.id, state.schedules.filter(schedule => schedule.origin === barangay.barangayName || schedule.destination === barangay.barangayName).length]));
  }
  if (path === '/settings/schedules/calendar-counts') {
    const counts: Record<string, number> = {};
    const boatsPerDay = new Map<string, Set<string>>();
    filterRows(asRows(state.schedules), params, 'departureDatetime').forEach(schedule => {
      const day = text(schedule.departureDatetime).slice(0, 10);
      if (params.mode === 'boats') {
        const boats = boatsPerDay.get(day) ?? new Set<string>(); boats.add(text(schedule.boatId)); boatsPerDay.set(day, boats); counts[day] = boats.size;
      } else counts[day] = (counts[day] ?? 0) + 1;
    });
    return counts;
  }
  if (path.startsWith('/settings/schedules/')) {
    const match = path.match(/^\/settings\/schedules\/([^/]+)\/trip-status$/);
    if (match && method === 'patch') {
      const schedule = lookup(asRows(state.schedules), match[1]);
      Object.assign(schedule, { tripStatus: data.status, tripStatusReason: data.reason, tripStatusEta: data.estimatedDepartureDatetime });
      noteAction('Updated', 'Schedules', text(schedule.id)); return schedule;
    }
  }
  if (path === '/settings/schedules' || path.startsWith('/settings/schedules/')) return collection(asRows(state.schedules), path, '/settings/schedules', method, hydrateSchedule(data), params, () => ({ tripStatus: 'preparing' }), 'departureDatetime');
  if (path === '/settings/fares' || path.startsWith('/settings/fares/')) return collection(asRows(state.fares), path, '/settings/fares', method, data, params, () => ({ isActive: true }));
  if (path === '/settings/barangays' || path.startsWith('/settings/barangays/')) return collection(asRows(state.barangays), path, '/settings/barangays', method, data, params);

  if (path === '/bookings/person' && method === 'post') return createBooking('person', data);
  if (path === '/bookings/cargo' && method === 'post') return createBooking('cargo', data);
  if (path === '/bookings/person' || path === '/bookings/person/paged') return collection(asRows(state.people), path, '/bookings/person', method, data, params);
  if (path === '/bookings/cargo' || path === '/bookings/cargo/paged') return collection(asRows(state.cargo), path, '/bookings/cargo', method, data, params);
  const bookingAction = path.match(/^\/bookings\/([^/]+)\/(status|cancel)$/);
  const paymentAction = path.match(/^\/payments\/([^/]+)\/verify$/);
  if (bookingAction || paymentAction) {
    const id = (bookingAction ?? paymentAction)![1];
    const booking = lookup([...asRows(state.people), ...asRows(state.cargo)], id);
    if (paymentAction) {
      const approved = data.approved === true || params.approved === true || params.approved === 'true';
      Object.assign(booking, { status: approved ? 'confirmed' : 'payment_rejected', paymentStatus: approved ? 'verified' : 'rejected', verifiedBy: demoUser.username, verifiedAt: now(), paymentNotes: data.reason });
    } else booking.status = bookingAction![2] === 'cancel' ? 'cancelled' : data.status;
    booking.updatedAt = now(); noteAction('Updated', paymentAction ? 'Payments' : 'Bookings', id); return booking;
  }

  if (path === '/boats' || path.startsWith('/boats/')) {
    if ((method === 'post' || method === 'put') && data.operatorId) {
      const operator = state.operators.find(item => item.id === text(data.operatorId));
      if (operator) Object.assign(data, { operatorName: operator.name, operatorIds: [operator.id], operatorNames: [operator.name] });
    }
    return collection(asRows(state.boats), path, '/boats', method, data, params, () => ({ status: 'registered', availableSeats: Number(data.capacity) || 0, confirmedSeats: 0, pendingSeats: 0, bancaTripStatus: 'preparing', cargoTripStatus: 'preparing' }));
  }

  if (path === '/admins/login') return state.admins[0];
  if (path === '/admins/check-username') return { available: !state.admins.some(admin => admin.username.toLowerCase() === text(params.username).toLowerCase()) };
  if (path === '/admins' || path.startsWith('/admins/')) {
    const response = collection(asRows(state.admins), path, '/admins', method, data, params, () => ({ adminId: ++nextId, isActive: true, mustChangePassword: false }));
    if (method === 'post') { const row = response as Row; row.id = text(row.adminId); }
    return response;
  }
  if (path.startsWith('/boat-operators/check-')) {
    const field = path.endsWith('license') ? 'licenseNumber' : path.endsWith('email') ? 'email' : 'username';
    return { available: !asRows(state.operators).some(operator => text(operator[field]).toLowerCase() === text(params[field]).toLowerCase()) };
  }
  if (path === '/boat-operators' || path.startsWith('/boat-operators/')) {
    const payload = { ...data };
    if (data.fullName != null) payload.name = data.fullName;
    if (data.contactNumber != null) payload.phone = data.contactNumber;
    if (typeof data.isActive === 'boolean') payload.status = data.isActive ? 'active' : 'inactive';
    const response = collection(asRows(state.operators), path, '/boat-operators', method, payload, params, () => ({ status: 'active', boats: [], mustChangePassword: false }));
    if (method === 'delete') return response;
    if (method === 'post') { const row = response as Row; row.id = String(++nextId); }
    return Array.isArray(response) ? response.map(operatorResponse) : operatorResponse(response as Row);
  }
  if (path === '/app-users' || path.startsWith('/app-users/')) return collection(asRows(state.appUsers), path, '/app-users', method, data, params);
  if (path === '/users/operators') return state.operators;
  if (path === '/users' || path.startsWith('/users/')) return collection(asRows(state.users), path, '/users', method, data, params, () => ({ status: 'active' }));

  if (path === '/notifications/history') {
    if (method === 'post') { const entry = { id: `history-${++nextId}`, username: text(data.username) || demoUser.username, action: text(data.action), moduleName: text(data.moduleName), entityName: text(data.entityName), information: text(data.information), createdAt: text(data.createdAt) || now() }; state.history.unshift(entry); return entry; }
    return state.history;
  }
  if (path === '/notifications/device-tokens/stats') return { totalActive: 0, userActive: 0, operatorActive: 0, publicActive: 0 };
  if (path === '/notifications/broadcast') {
    const notification = { id: `notice-${++nextId}`, type: text(data.type) || 'system', title: text(data.title), message: text(data.message), priority: text(data.priority) || 'high', isRead: false, createdAt: now() };
    asRows(state.notifications).unshift(notification);
    noteAction('Created', 'Notifications', notification.title);
    return { notification, targetedDevices: 0 };
  }
  if (path === '/notifications/read-all') { state.notifications.forEach(notification => { notification.isRead = true; }); return { message: 'All sample notifications marked read.' }; }
  const readNotice = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (readNotice) { lookup(asRows(state.notifications), readNotice[1]).isRead = true; return { message: 'Sample notification marked read.' }; }
  if (path === '/notifications' || path.startsWith('/notifications/')) return collection(asRows(state.notifications), path, '/notifications', method, data, params, () => ({ isRead: false, priority: 'low', type: 'system' }));

  const bookings = [...state.people, ...state.cargo];
  const paid = bookings.filter(booking => booking.paymentStatus === 'verified');
  const revenue = paid.reduce((sum, booking) => sum + booking.totalAmount, 0);
  if (path === '/reports/admin') return { adminUsers: state.admins.length + 1, actionsToday: state.history.filter(entry => entry.createdAt.slice(0, 10) === demoToday).length, systemHealth: 100 };
  if (path === '/reports/banca') return { activeBancas: state.boats.filter(boat => boat.type !== 'cargo' && boat.status === 'registered').length, tripsToday: state.schedules.filter(schedule => schedule.departureDatetime?.startsWith(demoToday)).length, utilizationRate: Math.round(state.boats.filter(boat => boat.type !== 'cargo').reduce((sum, boat) => sum + Number(boat.confirmedSeats ?? 0), 0) / Math.max(1, state.boats.filter(boat => boat.type !== 'cargo').reduce((sum, boat) => sum + boat.capacity, 0)) * 100) };
  if (path === '/reports/analytics') return { avgRevenuePerDay: Math.round(revenue / 3), growthRate: 12.8, topRoute: 'Binangonan - Talim Island', forecastNextMonth: Math.round(revenue / 3 * 30 * 1.128) };
  throw new DemoError(`The local portfolio demo does not implement ${method.toUpperCase()} ${path}.`, 404);
};

/** A real Axios adapter that never opens a connection or contacts a database. */
export const demoAdapter: AxiosAdapter = async config => {
  const url = new URL(config.url ?? '/', 'https://isla-demo.invalid');
  const path = url.pathname.replace(/^\/portfolio-isla-demo-api/, '').replace(/^\/api/, '').replace(/^\/v1/, '').replace('/settings/public/', '/settings/');
  const params: Params = { ...Object.fromEntries(url.searchParams.entries()), ...config.params };
  try {
    if (config.signal?.aborted) throw new DemoError('Demo request cancelled.', 499);
    const data = routeRequest(path.replace(/\/$/, '') || '/', (config.method ?? 'get').toLowerCase(), bodyOf(config), params);
    return { data: structuredClone(data), status: 200, statusText: 'OK', headers: new AxiosHeaders({ 'X-Portfolio-Demo': 'local-only' }), config };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The sample action could not be completed.';
    const status = error instanceof DemoError ? error.status : 500;
    const response = { data: { message, demo: true }, status, statusText: 'Local demo error', headers: new AxiosHeaders(), config };
    throw new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, undefined, response);
  }
};
