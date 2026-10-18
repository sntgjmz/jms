import { makeAutoObservable, runInAction } from 'mobx';
import { settingsAPI } from '@/api';
import type { FareMatrixConfigDTO, PagedResponse } from '@/api/settings';

export interface ContactInfo {
  email: string;
  phone: string;
  officeAddress: string;
  officeHours: string;
}

export interface Schedule {
  id: string;
  boatId?: string;
  boatName?: string;
  boatType?: string;
  operatorId?: string;
  operatorName?: string;
  routeFareId?: string;
  route: string;
  origin?: string;
  destination?: string;
  capacity?: number;
  availableSeats?: number;
  cargoBooked?: boolean;
  cargoBookingStatus?: string;
  departure: string;
  arrival: string;
  departureDatetime?: string;
  arrivalDatetime?: string;
  frequency?: string;
  notes?: string;
  recurrenceGroupId?: string;
  tripStatus?: string;
  tripStatusReason?: string;
  tripStatusEta?: string;
  selectedDays?: string[];
  validUntil?: string | null;
}

export interface Barangay {
  id: string;
  barangayName: string;
  zone: string;
  population: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type FareType = 'commuter' | 'cargo';

interface BaseFare {
  id: string;
  fareName: string;
  route: string;
  origin?: string;
  destination?: string;
  distanceKm: number;
  type: FareType;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommuterFare extends BaseFare {
  type: 'commuter';
  baseFare: number;
  percentagePerKilometer: number;
  // Cargo fields
  rentalFare: number | null;
  weightLimitKg: number | null;
}

export interface CargoFare extends BaseFare {
  type: 'cargo';
  rentalFare: number;
  weightLimitKg: number;
  // Commuter fields
  baseFare: number | null;
  percentagePerKilometer: number | null;
}

export type Fare = CommuterFare | CargoFare;

const sanitizeFarePayload = (
  payload: Partial<Omit<Fare, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>>,
): Partial<Omit<FareMatrixConfigDTO, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>> => ({
  ...payload,
  baseFare: payload.baseFare ?? undefined,
  percentagePerKilometer: payload.percentagePerKilometer ?? undefined,
  rentalFare: payload.rentalFare ?? undefined,
  weightLimitKg: payload.weightLimitKg ?? undefined,
});

class SettingsStore {
  contactInfo: ContactInfo = {
    email: '',
    phone: '',
    officeAddress: '',
    officeHours: '',
  };

  schedules: Schedule[] = [];
  barangays: Barangay[] = [];
  fares: Fare[] = [];
  publicBoatStatuses: Record<string, string> = {};
  fareScheduleUsageCounts: Record<string, number> = {};
  barangayScheduleUsageCounts: Record<string, number> = {};
  isLoading = false;
  isLoaded = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async ensureLoaded() {
    if (this.isLoading || this.isLoaded) {
      return;
    }
    await this.fetchAll();
  }

  async fetchAll() {
    this.isLoading = true;
    this.error = null;
    try {
      const [contact, schedules, barangays, fares] = await Promise.all([
        settingsAPI.getContact(),
        settingsAPI.getSchedules(),
        settingsAPI.getBarangays(),
        settingsAPI.getFares(),
      ]);
      runInAction(() => {
        this.contactInfo = {
          email: contact.email,
          phone: contact.phone,
          officeAddress: contact.officeAddress,
          officeHours: contact.officeHours,
        };
        this.schedules = schedules;
        this.barangays = barangays;
        this.fares = fares as Fare[];
        this.isLoaded = true;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load settings';
        this.isLoaded = false;
        this.isLoading = false;
      });
    }
  }

  async fetchPublicHomeContent() {
    this.isLoading = true;
    this.error = null;
    try {
      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 30);
      const to = toDate.toISOString().slice(0, 10);
      const [contact, schedules, boatStatuses, barangays, fares] = await Promise.all([
        settingsAPI.getPublicContact(),
        settingsAPI.getPublicSchedules({ from, to }),
        settingsAPI.getPublicBoatStatuses(),
        settingsAPI.getPublicBarangays(),
        settingsAPI.getPublicFares(),
      ]);
      runInAction(() => {
        this.contactInfo = {
          email: contact.email,
          phone: contact.phone,
          officeAddress: contact.officeAddress,
          officeHours: contact.officeHours,
        };
        this.schedules = schedules;
        this.publicBoatStatuses = boatStatuses;
        this.barangays = barangays;
        this.fares = fares as Fare[];
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to load public homepage settings';
        this.isLoading = false;
      });
    }
  }

  async updateContactInfo(contactInfo: ContactInfo) {
    const saved = await settingsAPI.updateContact(contactInfo);
    runInAction(() => {
      this.contactInfo = {
        email: saved.email,
        phone: saved.phone,
        officeAddress: saved.officeAddress,
        officeHours: saved.officeHours,
      };
    });
  }

  async addSchedule(schedule: Omit<Schedule, 'id'>) {
    await settingsAPI.createSchedule(schedule);
    await this.fetchAll();
  }

  async fetchContact() {
    const contact = await settingsAPI.getContact();
    runInAction(() => {
      this.contactInfo = {
        email: contact.email,
        phone: contact.phone,
        officeAddress: contact.officeAddress,
        officeHours: contact.officeHours,
      };
    });
  }

  async fetchSchedules(options?: { from?: string; to?: string }) {
    const schedules = await settingsAPI.getSchedules(options);
    runInAction(() => {
      this.schedules = schedules;
    });
  }

  async fetchPagedSchedules(options?: {
    from?: string;
    to?: string;
    q?: string;
    status?: string;
    selectedDate?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<Schedule>> {
    return settingsAPI.getPagedSchedules(options);
  }

  async fetchBarangays() {
    const barangays = await settingsAPI.getBarangays();
    runInAction(() => {
      this.barangays = barangays;
    });
  }

  async fetchFares() {
    const fares = await settingsAPI.getFares();
    runInAction(() => {
      this.fares = fares as Fare[];
    });
  }

  async fetchFareScheduleUsageCounts() {
    const counts = await settingsAPI.getFareScheduleUsageCounts();
    runInAction(() => {
      this.fareScheduleUsageCounts = counts;
    });
  }

  async fetchBarangayScheduleUsageCounts() {
    const counts = await settingsAPI.getBarangayScheduleUsageCounts();
    runInAction(() => {
      this.barangayScheduleUsageCounts = counts;
    });
  }

  async getScheduleCalendarCounts(options: {
    from: string;
    to: string;
    q?: string;
    status?: string;
    mode?: 'trips' | 'boats';
    boatTypes?: string;
  }) {
    try {
      return await settingsAPI.getScheduleCalendarCounts(options);
    } catch {
      const schedules = await settingsAPI.getSchedules({ from: options.from, to: options.to });
      const counts: Record<string, number> = {};
      const allowedBoatTypes = new Set(
        (options.boatTypes ?? '')
          .split(',')
          .map((type) => type.trim().toLowerCase())
          .filter(Boolean),
      );

      if (options.mode === 'boats') {
        const boatIdsByDate = new Map<string, Set<string>>();
        schedules.forEach((schedule) => {
          const dateKey = schedule.departureDatetime?.slice(0, 10);
          const boatType = schedule.boatType?.trim().toLowerCase() ?? '';
          if (!dateKey || !schedule.boatId) return;
          if (allowedBoatTypes.size > 0 && !allowedBoatTypes.has(boatType)) return;
          const bucket = boatIdsByDate.get(dateKey) ?? new Set<string>();
          bucket.add(schedule.boatId);
          boatIdsByDate.set(dateKey, bucket);
        });
        boatIdsByDate.forEach((boatIds, dateKey) => {
          counts[dateKey] = boatIds.size;
        });
        return counts;
      }

      schedules.forEach((schedule) => {
        const dateKey = schedule.departureDatetime?.slice(0, 10);
        if (!dateKey) return;
        counts[dateKey] = (counts[dateKey] ?? 0) + 1;
      });
      return counts;
    }
  }

  async createScheduleRecord(schedule: Omit<Schedule, 'id'>) {
    const created = await settingsAPI.createSchedule(schedule);
    runInAction(() => {
      this.schedules = [created, ...this.schedules];
    });
    return created as Schedule;
  }

  async updateSchedule(
    id: string,
    schedule: Partial<Omit<Schedule, 'id'>>,
    options?: { scope?: 'single' | 'future' },
  ) {
    const current = this.schedules.find((s) => s.id === id);
    if (!current) return;
    await settingsAPI.updateSchedule(id, {
      ...current,
      ...schedule,
    }, options);
    await this.fetchAll();
  }

  async updateScheduleTripStatus(
    id: string,
    payload: { status: string; reason?: string; estimatedDepartureDatetime?: string },
  ): Promise<{ success: boolean; message?: string; schedule?: Schedule }> {
    try {
      const updated = await settingsAPI.updateScheduleTripStatus(id, payload);
      runInAction(() => {
        this.schedules = this.schedules.map((schedule) => (schedule.id === id ? (updated as Schedule) : schedule));
      });
      return { success: true, schedule: updated as Schedule };
    } catch (error: any) {
      const message = error?.response?.data?.message || (error instanceof Error ? error.message : 'Failed to update trip status.');
      return { success: false, message };
    }
  }

  async deleteSchedule(
    id: string,
    options?: { scope?: 'single' | 'future' | 'until'; untilDate?: string },
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await settingsAPI.deleteSchedule(id, options);
      runInAction(() => {
        this.schedules = this.schedules.filter((s) => s.id !== id);
      });
      await this.fetchAll();
      return { success: true };
    } catch (error: any) {
      const message = error?.response?.data?.message || (error instanceof Error ? error.message : 'Failed to delete schedule.');
      return { success: false, message };
    }
  }

  async addBarangay(payload: Omit<Barangay, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await settingsAPI.createBarangay(payload);
    runInAction(() => {
      this.barangays = [created, ...this.barangays];
    });
  }

  async updateBarangay(id: string, payload: Partial<Omit<Barangay, 'id' | 'createdAt'>>) {
    const updated = await settingsAPI.updateBarangay(id, payload);
    runInAction(() => {
      this.barangays = this.barangays.map((barangay) => (barangay.id === id ? updated : barangay));
    });
  }

  async deleteBarangay(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      await settingsAPI.deleteBarangay(id);
      runInAction(() => {
        this.barangays = this.barangays.filter((barangay) => barangay.id !== id);
      });
      return { success: true };
    } catch (error: any) {
      if (error?.response?.status === 409) {
        const defaultMessage = 'Cannot delete barangay. It is currently used by routes, schedules, or bookings.';
        const backendMessage = error.response?.data?.message;
        return { success: false, message: backendMessage || defaultMessage };
      }
      const message = error instanceof Error ? error.message : 'Failed to delete barangay.';
      runInAction(() => {
        this.error = message;
      });
      return { success: false, message };
    }
  }

  async addFare(payload: Omit<Fare, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) {
    const created = await settingsAPI.createFare(
      sanitizeFarePayload(payload) as Omit<FareMatrixConfigDTO, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
    );
    runInAction(() => {
      this.fares = [created as Fare, ...this.fares];
    });
  }

  async updateFare(id: string, payload: Partial<Omit<Fare, 'id' | 'createdAt'>>) {
    const updated = await settingsAPI.updateFare(id, sanitizeFarePayload(payload));
    runInAction(() => {
      this.fares = this.fares.map((fare) => (fare.id === id ? (updated as Fare) : fare));
    });
  }

  async deleteFare(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      await settingsAPI.deleteFare(id);
      runInAction(() => {
        this.fares = this.fares.filter((fare) => fare.id !== id);
      });
      return { success: true };
    } catch (error: any) {
      // Handle 409 Conflict specifically for better user feedback
      if (error?.response?.status === 409) {
        const defaultMessage = 'Cannot delete fare. It is currently used by one or more schedules.';
        const backendMessage = error.response?.data?.message;
        return { success: false, message: backendMessage || defaultMessage };
      }
      const message = error instanceof Error ? error.message : 'Failed to delete fare.';
      return { success: false, message };
    }
  }

  async toggleFareStatus(id: string) {
    const updated = await settingsAPI.toggleFare(id);
    runInAction(() => {
      this.fares = this.fares.map((fare) => (fare.id === id ? (updated as Fare) : fare));
    });
  }
}

export default SettingsStore;
