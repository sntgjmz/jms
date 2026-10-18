import React from 'react';
import {
  LayoutDashboard,
  Settings,
  UserCog,
  User,
  Users,
  Ship,
  Package,
  DollarSign,
  FileText,
  CheckCircle,
  Bell,
  Calendar,
  MapPinned,
  Mail,
  Info,
  Shield,
  Anchor,
  Siren,
  History,
  Activity
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  visible: boolean;
  children?: NavItem[];
}

export const createNavigation = (userRole: string | undefined) => {
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/dashboard',
      visible: true,
    },
    {
      label: 'Setup',
      icon: <MapPinned className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Barangays',
          icon: <MapPinned className="h-4 w-4" />,
          path: '/barangays/management',
          visible: isAdmin,
        },
        {
          label: 'Fares',
          icon: <DollarSign className="h-4 w-4" />,
          path: '/fares/management',
          visible: isAdmin,
        },
        {
          label: 'Schedules',
          icon: <Calendar className="h-4 w-4" />,
          path: '/settings/schedules',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Vessels',
      icon: <Ship className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Boats',
          icon: <Ship className="h-4 w-4" />,
          path: '/boats/management',
          visible: isAdmin,
        },
        {
          label: 'Vessel Tracking',
          icon: <Anchor className="h-4 w-4" />,
          path: '/vessels/management',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Admins',
          icon: <Shield className="h-4 w-4" />,
          path: '/users/admins',
          visible: isSuperAdmin,
        },
        {
          label: 'Operators',
          icon: <UserCog className="h-4 w-4" />,
          path: '/users/operators',
          visible: isAdmin,
        },
        {
          label: 'App Users',
          icon: <User className="h-4 w-4" />,
          path: '/users/app-users',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Bookings',
      icon: <FileText className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Passenger Bookings',
          icon: <Users className="h-4 w-4" />,
          path: '/bookings/person',
          visible: isAdmin,
        },
        {
          label: 'Cargo Bookings',
          icon: <Package className="h-4 w-4" />,
          path: '/bookings/cargo',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Payments',
      icon: <DollarSign className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Verification',
          icon: <CheckCircle className="h-4 w-4" />,
          path: '/payment-verification',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Alerts',
      icon: <Bell className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Activity Log',
          icon: <History className="h-4 w-4" />,
          path: '/notifications',
          visible: isAdmin,
        },
        {
          label: 'Admin Alerts',
          icon: <Bell className="h-4 w-4" />,
          path: '/notifications/admin-alerts',
          visible: isAdmin,
        },
        {
          label: 'Calamity Alerts',
          icon: <Siren className="h-4 w-4" />,
          path: '/notifications/calamity-alerts',
          visible: isAdmin,
        },
        {
          label: 'Realtime Feed',
          icon: <Activity className="h-4 w-4" />,
          path: '/notifications/activity-feed',
          visible: isSuperAdmin,
        },
      ],
    },
    {
      label: 'Reports',
      icon: <FileText className="h-5 w-5" />,
      visible: isAdmin,
      children: [
        {
          label: 'Admin',
          icon: <FileText className="h-4 w-4" />,
          path: '/reports/admin',
          visible: isAdmin,
        },
        {
          label: 'Banca',
          icon: <FileText className="h-4 w-4" />,
          path: '/reports/banca',
          visible: isAdmin,
        },
        {
          label: 'Analytics',
          icon: <FileText className="h-4 w-4" />,
          path: '/reports/analytics',
          visible: isAdmin,
        },
      ],
    },
    {
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      visible: true,
      children: [
        {
          label: 'Account',
          icon: <UserCog className="h-4 w-4" />,
          path: '/settings/account',
          visible: true,
        },
        {
          label: 'Contact',
          icon: <Mail className="h-4 w-4" />,
          path: '/settings/contact',
          visible: true,
        },
        {
          label: 'About',
          icon: <Info className="h-4 w-4" />,
          path: '/settings/about',
          visible: true,
        },
      ],
    },
  ];

  return navItems;
};
