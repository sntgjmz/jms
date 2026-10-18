import { makeAutoObservable } from 'mobx';
import type { User, LoginCredentials } from '@/types';

export class AuthStore {
  user: User | null = {
    id: '1', username: 'Demo administrator', email: 'admin@isla-demo.example',
    role: 'super_admin', status: 'active', createdAt: '2026-01-01T00:00:00Z',
  };
  token: string | null = 'fictional-portfolio-demo';
  isLoading = false;
  error: string | null = null;

  constructor() { makeAutoObservable(this); }

  get isAuthenticated() { return true; }
  get isSuperAdmin() { return true; }
  get isAdmin() { return true; }

  async login(_credentials: LoginCredentials) {
    return { success: true, message: 'This is a fictional demo account.' };
  }
  async logout() { window.location.reload(); }
  clearAuth() { this.error = null; }
  updateUser(updates: Partial<User>) {
    if (this.user) this.user = { ...this.user, ...updates, role: 'super_admin' };
  }
  setError(error: string | null) { this.error = error; }
}
