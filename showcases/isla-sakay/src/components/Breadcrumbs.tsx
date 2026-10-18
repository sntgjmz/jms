import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const formatBreadcrumb = (str: string) => {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Define valid routes that should be clickable
  const validRoutes = new Set([
    '/dashboard',
    '/users/operators',
    '/users/admins',
    '/users/app-users',
    '/boats/management',
    '/vessels/management',
    '/bookings/person',
    '/bookings/cargo',
    '/reports/admin',
    '/reports/banca',
    '/reports/analytics',
    '/payment-verification',
    '/notifications',
    '/notifications/admin-alerts',
    '/notifications/calamity-alerts',
    '/settings/account',
    '/settings/schedules',
    '/barangays/management',
    '/fares/management',
    '/settings/contact',
    '/settings/about'
  ]);

  if (pathnames.length === 0 || location.pathname === '/') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {pathnames.map((path, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const isValidRoute = validRoutes.has(routeTo);
        const breadcrumbName = formatBreadcrumb(path);

        return (
          <div key={routeTo} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{breadcrumbName}</span>
            ) : isValidRoute ? (
              <Link
                to={routeTo}
                className="hover:text-blue-600 transition-colors"
              >
                {breadcrumbName}
              </Link>
            ) : (
              <span className="text-gray-500">{breadcrumbName}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

