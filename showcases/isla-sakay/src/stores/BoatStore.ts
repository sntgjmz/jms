import { makeAutoObservable, runInAction } from 'mobx';
import type { Boat, CreateBoatForm } from '@/types';
import { boatAPI } from '@/api';

export class BoatStore {
  boats: Boat[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get totalBoats(): number {
    return this.boats.length;
  }

  get registeredBoats(): Boat[] {
    return this.boats.filter(b => b.status === 'registered');
  }

  get nonRegisteredBoats(): Boat[] {
    return this.boats.filter(b => b.status === 'non_registered');
  }

  get codingBoats(): Boat[] {
    return this.boats.filter(b => b.status === 'coding');
  }

  get bancaBoats(): Boat[] {
    return this.boats.filter(b => b.type === 'banca');
  }

  get cargoBoats(): Boat[] {
    return this.boats.filter(b => b.type === 'cargo');
  }

  async fetchBoats(filters?: Record<string, unknown>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const boats = await boatAPI.getBoats(filters);
      
      runInAction(() => {
        this.boats = boats;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch boats';
        this.isLoading = false;
      });
    }
  }

  async createBoat(data: CreateBoatForm): Promise<{ success: boolean; message: string; boatId?: string }> {
    this.isLoading = true;
    this.error = null;

    try {
      const boat = await boatAPI.createBoat(data);
      
      runInAction(() => {
        this.boats = [boat, ...this.boats];
        this.isLoading = false;
      });

      return { success: true, message: 'Boat created successfully', boatId: boat.id };
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create boat';
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to create boat' };
    }
  }

  async updateBoat(id: string, data: Partial<Boat>): Promise<{ success: boolean; message: string }> {
    this.isLoading = true;
    this.error = null;

    try {
      const updatedBoat = await boatAPI.updateBoat(id, data);
      
      runInAction(() => {
        const index = this.boats.findIndex(b => b.id === id);
        if (index !== -1) {
          this.boats[index] = updatedBoat;
        }
        this.isLoading = false;
      });

      return { success: true, message: 'Boat updated successfully' };
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update boat';
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to update boat' };
    }
  }

  async deleteBoat(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await boatAPI.deleteBoat(id);
      
      runInAction(() => {
        this.boats = this.boats.filter(b => b.id !== id);
      });

      return { success: true, message: 'Boat deleted successfully' };
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to delete boat';
      return { success: false, message: this.error || 'Failed to delete boat' };
    }
  }

  async updateBoatStatus(id: string, status: string): Promise<void> {
    try {
      await boatAPI.updateBoatStatus(id, status);
      
      runInAction(() => {
        const boat = this.boats.find(b => b.id === id);
        if (boat) {
          boat.status = status as Boat['status'];
        }
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to update boat status';
      throw error;
    }
  }

  getBoatById(id: string): Boat | undefined {
    return this.boats.find(b => b.id === id);
  }

  filterByType(type: string): Boat[] {
    return this.boats.filter(b => b.type === type);
  }

  filterByStatus(status: string): Boat[] {
    return this.boats.filter(b => b.status === status);
  }

  filterBySection(section: string): Boat[] {
    return this.boats.filter(b => b.section === section);
  }

  searchBoats(query: string): Boat[] {
    const lowerQuery = query.toLowerCase();
    return this.boats.filter(b =>
      b.name.toLowerCase().includes(lowerQuery) ||
      b.operatorName.toLowerCase().includes(lowerQuery) ||
      (b.operatorNames ?? []).join(' ').toLowerCase().includes(lowerQuery) ||
      (b.registrationNumber && b.registrationNumber.toLowerCase().includes(lowerQuery))
    );
  }
}
