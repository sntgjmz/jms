import BoatManagementPage from './features/boats/pages/BoatManagementPage';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import { StoreProvider } from './stores/RootStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import HomePage from './features/public/pages/HomePage';
import NotFoundPage from './features/public/pages/NotFoundPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import BoatOperatorsPage from './features/users/boat-operators/pages/BoatOperatorsPage';
import AdminPage from './features/users/admin/pages/AdminPage';
import AppUsersPage from './features/users/app-users/pages/AppUsersPage';
import ChangePasswordPage from './features/users/account/pages/ChangePasswordPage';
import PersonBookingsPage from './features/bookings/pages/PersonBookingsPage';
import CargoBookingsPage from './features/bookings/pages/CargoBookingsPage';
import VesselManagementPage from './features/vessels/pages/VesselManagementPage';
import PaymentVerificationPage from './features/verification/pages/PaymentVerificationPage';
import NotificationsHistoryPage from './features/notifications/pages/NotificationsHistoryPage';
import AdminAlertsPage from './features/notifications/pages/AdminAlertsPage';
import CalamityAlertsPage from './features/notifications/pages/CalamityAlertsPage';
import ActivityFeedPage from './features/notifications/pages/ActivityFeedPage';
import AccountSettingsPage from './features/settings/account/pages/AccountSettingsPage';
import SchedulesPage from './features/settings/setup/schedules/pages/SchedulesPage';
import ContactPage from './features/settings/contact/pages/ContactPage';
import AboutPage from './features/settings/about/pages/AboutPage';
import BarangayManagementPage from './features/settings/setup/barangays/pages/BarangayManagementPage';
import FareManagementPage from './features/settings/setup/fares/pages/FareManagementPage';
import AdminReportsPage from './features/reports/pages/AdminReportsPage';
import BancaReportsPage from './features/reports/pages/BancaReportsPage';
import AnalyticsPage from './features/reports/pages/AnalyticsPage';

function App() {
  return (
    <ErrorBoundary>
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus();
          main?.scrollIntoView({ block: 'start' });
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <StoreProvider>
        <CookieConsentProvider>
        <Router>
          <AuthProvider>
            <LoadingProvider>
              <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          {/* Boat Management Main Page */}
          <Route path="/boats/management" element={
            <ProtectedRoute>
              <BoatManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/vessels/management" element={
            <ProtectedRoute>
              <VesselManagementPage />
            </ProtectedRoute>
          } />
          {/* Booking Management */}
          <Route path="/bookings/person" element={
            <ProtectedRoute>
              <PersonBookingsPage />
            </ProtectedRoute>
          } />
          <Route path="/bookings/cargo" element={
            <ProtectedRoute>
              <CargoBookingsPage />
            </ProtectedRoute>
          } />
          <Route path="/availability/current" element={<Navigate to="/vessels/management" replace />} />

          {/* User Management */}
           <Route path="/users/operators" element={
             <ProtectedRoute>
               <BoatOperatorsPage />
             </ProtectedRoute>
           } />
           <Route path="/users/admins" element={
             <ProtectedRoute requiredRole="super_admin">
               <AdminPage />
             </ProtectedRoute>
           } />
           <Route path="/users/app-users" element={
             <ProtectedRoute>
               <AppUsersPage />
             </ProtectedRoute>
           } />

           <Route path="/change-password" element={
             <ProtectedRoute>
               <ChangePasswordPage />
             </ProtectedRoute>
           } />

          {/* Payment & Reports */}
          <Route path="/payment-verification" element={
            <ProtectedRoute>
              <PaymentVerificationPage />
            </ProtectedRoute>
          } />
          <Route path="/reports/admin" element={
            <ProtectedRoute>
              <AdminReportsPage />
            </ProtectedRoute>
          } />
          <Route path="/reports/banca" element={
            <ProtectedRoute>
              <BancaReportsPage />
            </ProtectedRoute>
          } />
          <Route path="/reports/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />

          {/* Notifications */}
          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/notifications/admin-alerts" element={
            <ProtectedRoute>
              <AdminAlertsPage />
            </ProtectedRoute>
          } />
          <Route path="/notifications/calamity-alerts" element={
            <ProtectedRoute>
              <CalamityAlertsPage />
            </ProtectedRoute>
          } />
          <Route path="/notifications/activity-feed" element={
            <ProtectedRoute requiredRole="super_admin">
              <ActivityFeedPage />
            </ProtectedRoute>
          } />

          {/* Settings */}
          <Route path="/settings/account" element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/settings/schedules" element={
            <ProtectedRoute>
              <SchedulesPage />
            </ProtectedRoute>
          } />
          <Route path="/barangays/management" element={
            <ProtectedRoute>
              <BarangayManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/fares/management" element={
            <ProtectedRoute>
              <FareManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/settings/contact" element={
            <ProtectedRoute>
              <ContactPage />
            </ProtectedRoute>
          } />
          <Route path="/settings/about" element={
            <ProtectedRoute>
              <AboutPage />
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
        <CookieConsentBanner />
        </LoadingProvider>
      </AuthProvider>
    </Router>
    </CookieConsentProvider>
    </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
