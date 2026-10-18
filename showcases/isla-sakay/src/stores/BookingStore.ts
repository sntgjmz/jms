import { makeAutoObservable, runInAction } from 'mobx';
import type { PersonBooking, CargoBooking, CreateBookingForm } from '@/types';
import { bookingAPI, paymentAPI } from '@/api';
import type { AxiosError } from 'axios';

export class BookingStore {
  personBookings: PersonBooking[] = [];
  cargoBookings: CargoBooking[] = [];
  personBookingsTotal = 0;
  personBookingsTotalPages = 1;
  cargoBookingsTotal = 0;
  cargoBookingsTotalPages = 1;
  isLoading = false;
  error: string | null = null;

  private resolveAxiosMessage(error: unknown, fallback: string) {
    const axiosMessage = (error as AxiosError<{ message?: string }>).response?.data?.message;
    if (axiosMessage) return axiosMessage;
    return error instanceof Error ? error.message : fallback;
  }

  constructor() {
    makeAutoObservable(this);
  }

  get totalPersonBookings(): number {
    return this.personBookings.length;
  }

  get totalCargoBookings(): number {
    return this.cargoBookings.length;
  }

  get pendingPersonBookings(): PersonBooking[] {
    return this.personBookings.filter((b) =>
      ['pending', 'pending_payment', 'for_verification', 'for_cash_collection'].includes(b.status),
    );
  }

  get confirmedPersonBookings(): PersonBooking[] {
    return this.personBookings.filter(b => b.status === 'confirmed');
  }

  async fetchPersonBookings(filters?: Record<string, unknown>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const bookings = await bookingAPI.getPersonBookings(filters);
      
      runInAction(() => {
        this.personBookings = bookings;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch person bookings';
        this.isLoading = false;
      });
    }
  }

  async fetchPagedPersonBookings(filters?: Record<string, unknown>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await bookingAPI.getPagedPersonBookings(filters);
      runInAction(() => {
        this.personBookings = response.items;
        this.personBookingsTotal = response.totalItems;
        this.personBookingsTotalPages = response.totalPages;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch person bookings';
        this.isLoading = false;
      });
    }
  }

  async createPersonBooking(data: CreateBookingForm, actor = 'system'): Promise<{ success: boolean; message: string }> {
    void actor;
    this.isLoading = true;
    this.error = null;
    try {
      if (!data.passengerName || !data.phone || !data.numberOfPassengers || !data.scheduleId) {
        throw new Error('Missing required person booking fields.');
      }
      const today = new Date().toISOString().slice(0, 10);
      if (data.date < today) {
        throw new Error('Booking date cannot be in the past.');
      }
      if ((data.totalAmount ?? 0) <= 0) {
        throw new Error('Total amount is invalid. Configure fare first.');
      }
      await bookingAPI.createPersonBooking({
        passengerName: data.passengerName,
        numberOfPassengers: data.numberOfPassengers,
        seniorCitizenCount: data.seniorCitizenCount ?? 0,
        pwdCount: data.pwdCount ?? 0,
        seniorCitizenIds: data.seniorCitizenIds,
        pwdIds: data.pwdIds,
        farePerPassenger: data.farePerPassenger,
        discountAmount: data.discountAmount ?? 0,
        phone: data.phone,
        scheduleId: data.scheduleId,
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        time: data.time,
        totalAmount: data.totalAmount ?? 0,
        paymentMethod: data.paymentMethod ?? 'cash',
        paymentReference: data.paymentReference,
        boatId: data.boatId,
        paymentProofImageUrl: data.paymentProofImageUrl,
      });
      await Promise.all([this.fetchPersonBookings(), this.fetchCargoBookings()]);
      runInAction(() => {
        this.isLoading = false;
      });
      return { success: true, message: 'Walk-in person booking created.' };
    } catch (error) {
      runInAction(() => {
        this.error = this.resolveAxiosMessage(error, 'Failed to create person booking');
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to create person booking' };
    }
  }

  async fetchCargoBookings(filters?: Record<string, unknown>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const bookings = await bookingAPI.getCargoBookings(filters);
      
      runInAction(() => {
        this.cargoBookings = bookings;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch cargo bookings';
        this.isLoading = false;
      });
    }
  }

  async fetchPagedCargoBookings(filters?: Record<string, unknown>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await bookingAPI.getPagedCargoBookings(filters);
      runInAction(() => {
        this.cargoBookings = response.items;
        this.cargoBookingsTotal = response.totalItems;
        this.cargoBookingsTotalPages = response.totalPages;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch cargo bookings';
        this.isLoading = false;
      });
    }
  }

  async createCargoBooking(data: CreateBookingForm, actor = 'system'): Promise<{ success: boolean; message: string }> {
    void actor;
    this.isLoading = true;
    this.error = null;
    try {
      if (
        !data.senderName ||
        !data.senderPhone ||
        !data.receiverName ||
        !data.receiverPhone ||
        !data.cargoDescription ||
        !data.weight ||
        !data.scheduleId
      ) {
        throw new Error('Missing required cargo booking fields.');
      }
      const today = new Date().toISOString().slice(0, 10);
      if (data.date < today) {
        throw new Error('Booking date cannot be in the past.');
      }
      if ((data.totalAmount ?? 0) <= 0) {
        throw new Error('Total amount is invalid. Configure fare first.');
      }
      await bookingAPI.createCargoBooking({
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        cargoDescription: data.cargoDescription,
        weight: data.weight,
        scheduleId: data.scheduleId,
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        totalAmount: data.totalAmount ?? 0,
        paymentMethod: data.paymentMethod ?? 'cash',
        paymentReference: data.paymentReference,
        boatId: data.boatId,
        paymentProofImageUrl: data.paymentProofImageUrl,
      });
      await Promise.all([this.fetchPersonBookings(), this.fetchCargoBookings()]);
      runInAction(() => {
        this.isLoading = false;
      });
      return { success: true, message: 'Walk-in cargo booking created.' };
    } catch (error) {
      runInAction(() => {
        this.error = this.resolveAxiosMessage(error, 'Failed to create cargo booking');
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to create cargo booking' };
    }
  }

  async updateBookingStatus(id: string, status: string, type: 'person' | 'cargo', actor = 'system'): Promise<void> {
    void type;
    void actor;
    try {
      await bookingAPI.updateBookingStatus(id, status);
      await Promise.all([this.fetchPersonBookings(), this.fetchCargoBookings()]);
    } catch (error) {
      this.error = this.resolveAxiosMessage(error, 'Failed to update booking status');
      throw error;
    }
  }

  async cancelBooking(id: string, type: 'person' | 'cargo', actor = 'system'): Promise<void> {
    try {
      await this.updateBookingStatus(id, 'cancelled', type, actor);
    } catch (error) {
      this.error = this.resolveAxiosMessage(error, 'Failed to cancel booking');
      throw error;
    }
  }

  async verifyBookingPayment(
    id: string,
    type: 'person' | 'cargo',
    approved: boolean,
    verifiedBy: string,
    reason?: string,
  ): Promise<boolean> {
    void type;
    void verifiedBy;
    try {
      await paymentAPI.verifyPayment(id, approved, reason);
      await Promise.all([this.fetchPersonBookings(), this.fetchCargoBookings()]);
      return true;
    } catch (error) {
      this.error = this.resolveAxiosMessage(error, 'Failed to verify payment');
      return false;
    }
  }

  filterPersonBookingsByStatus(status: string): PersonBooking[] {
    return this.personBookings.filter(b => b.status === status);
  }

  filterCargoBookingsByStatus(status: string): CargoBooking[] {
    return this.cargoBookings.filter(b => b.status === status);
  }

  searchPersonBookings(query: string): PersonBooking[] {
    const lowerQuery = query.toLowerCase();
    return this.personBookings.filter(b =>
      b.passengerName.toLowerCase().includes(lowerQuery) ||
      b.destination.toLowerCase().includes(lowerQuery) ||
      b.origin.toLowerCase().includes(lowerQuery)
    );
  }
}
