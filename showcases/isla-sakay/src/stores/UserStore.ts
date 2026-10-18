import { makeAutoObservable, runInAction } from 'mobx';
import { userAPI } from '@/api';
import type { User, BoatOperator, CreateUserForm } from '@/types';

export class UserStore {
  users: User[] = [];
  boatOperators: BoatOperator[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get adminUsers(): User[] {
    return this.users.filter(u => u.role === 'admin' || u.role === 'super_admin');
  }

  get activeUsers(): User[] {
    return this.users.filter(u => u.status === 'active');
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get totalOperators(): number {
    return this.boatOperators.length;
  }

  async fetchUsers(role?: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const users = await userAPI.getUsers(role);
      
      runInAction(() => {
        this.users = users;
        this.isLoading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to fetch users';
        this.isLoading = false;
      });
    }
  }

  async fetchBoatOperators(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const operators = await userAPI.getBoatOperators();
      
      runInAction(() => {
        this.boatOperators = operators;
        this.isLoading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to fetch boat operators';
        this.isLoading = false;
      });
    }
  }

  async createUser(data: CreateUserForm): Promise<{ success: boolean; message: string }> {
    this.isLoading = true;
    this.error = null;

    try {
      const user = await userAPI.createUser(data);
      
      runInAction(() => {
        this.users.push(user);
        this.isLoading = false;
      });

      return { success: true, message: 'User created successfully' };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to create user';
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to create user' };
    }
  }

  async updateUser(id: string, data: Partial<User>): Promise<{ success: boolean; message: string }> {
    this.isLoading = true;
    this.error = null;

    try {
      const updatedUser = await userAPI.updateUser(id, data);
      
      runInAction(() => {
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.isLoading = false;
      });

      return { success: true, message: 'User updated successfully' };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to update user';
        this.isLoading = false;
      });
      return { success: false, message: this.error || 'Failed to update user' };
    }
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await userAPI.deleteUser(id);
      
      runInAction(() => {
        this.users = this.users.filter(u => u.id !== id);
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      this.error = error.message || 'Failed to delete user';
      return { success: false, message: this.error || 'Failed to delete user' };
    }
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  searchUsers(query: string): User[] {
    const lowerQuery = query.toLowerCase();
    return this.users.filter(u =>
      u.username.toLowerCase().includes(lowerQuery) ||
      u.email.toLowerCase().includes(lowerQuery) ||
      (u.firstName && u.firstName.toLowerCase().includes(lowerQuery)) ||
      (u.lastName && u.lastName.toLowerCase().includes(lowerQuery))
    );
  }

  filterByRole(role: string): User[] {
    return this.users.filter(u => u.role === role);
  }

  filterByStatus(status: string): User[] {
    return this.users.filter(u => u.status === status);
  }
}
