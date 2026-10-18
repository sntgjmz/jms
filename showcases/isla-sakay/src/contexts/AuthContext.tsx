import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '@/types/models';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  setAuthenticatedUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const demoUser: User = {
  id: '1',
  username: 'Demo administrator',
  email: 'admin@isla-demo.example',
  firstName: 'Demo',
  lastName: 'Administrator',
  role: 'super_admin',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// The showcase has no real accounts, authentication, cookies, or backend sessions.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(demoUser);

  return (
    <AuthContext.Provider value={{
      user,
      login: async () => ({ success: true, message: 'You are exploring a fictional demo account.' }),
      setAuthenticatedUser: (nextUser) => setUser(nextUser ? { ...nextUser, role: 'super_admin' } : demoUser),
      logout: () => window.location.reload(),
      isAuthenticated: true,
      isLoading: false,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
