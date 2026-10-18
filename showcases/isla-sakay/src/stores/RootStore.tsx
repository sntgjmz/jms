import { createContext, useContext } from 'react';
import { AuthStore } from './AuthStore';
import { BookingStore } from './BookingStore';
import { UserStore } from './UserStore';
import { BoatStore } from './BoatStore';
import { NotificationStore } from './NotificationStore';
import SettingsStore from './SettingsStore';

export class RootStore {
  authStore: AuthStore;
  bookingStore: BookingStore;
  userStore: UserStore;
  boatStore: BoatStore;
  notificationStore: NotificationStore;
  settingsStore: SettingsStore;

  constructor() {
    this.authStore = new AuthStore();
    this.bookingStore = new BookingStore();
    this.userStore = new UserStore();
    this.boatStore = new BoatStore();
    this.notificationStore = new NotificationStore();
    this.settingsStore = new SettingsStore();
  }
}

const rootStore = new RootStore();
const StoreContext = createContext(rootStore);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const useAuthStore = () => useStore().authStore;
export const useBookingStore = () => useStore().bookingStore;
export const useUserStore = () => useStore().userStore;
export const useBoatStore = () => useStore().boatStore;
export const useNotificationStore = () => useStore().notificationStore;
export const useSettingsStore = () => useStore().settingsStore;

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

export default rootStore;
