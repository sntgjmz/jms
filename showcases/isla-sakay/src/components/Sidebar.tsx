import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores';
import { LogOut, ChevronDown, ChevronRight, Menu, X, UserCircle, Info, Search, ChevronsLeft, ChevronsRight, Clock3 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { createNavigation, type NavItem } from '@/config/navigation';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { deriveExpandedLabels, filterNavItems, isActiveParent, isActivePath } from './sidebar/navigation';
import { loadCollapsedState, loadExpandedItems, saveCollapsedState, saveExpandedItems } from './sidebar/storage';
import '@/styles/components/Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const notificationStore = useNotificationStore();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(loadExpandedItems);
  const [isCollapsed, setIsCollapsed] = useState(loadCollapsedState);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobilePhNowLabel, setMobilePhNowLabel] = useState(
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
  );

  const navItems = useMemo(() => createNavigation(user?.role), [user?.role]);
  const alertsUnreadCount = notificationStore.unreadCount;
  const adminAlertsUnreadCount = useMemo(
    () => notificationStore.notifications.filter((n) => !n.isRead && (n.type === 'system' || n.type === 'weather')).length,
    [notificationStore.notifications],
  );

  useEffect(() => {
    if (!notificationStore.hasFetched && !notificationStore.isLoading) {
      void notificationStore.fetchNotifications();
    }
  }, [notificationStore]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    saveCollapsedState(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const intervalId = window.setInterval(() => {
      setMobilePhNowLabel(formatter.format(new Date()));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileOpen]);

  const filteredNavItems = useMemo(() => filterNavItems(navItems, searchQuery), [navItems, searchQuery]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      const updated = prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label];
      saveExpandedItems(updated);
      return updated;
    });
  };

  const derivedExpandedLabels = useMemo(
    () => deriveExpandedLabels(navItems, filteredNavItems, searchQuery, location.pathname),
    [filteredNavItems, navItems, searchQuery, location.pathname],
  );

  const isExpanded = (label: string) => expandedItems.includes(label) || derivedExpandedLabels.has(label);

  const itemBaseClass =
    'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150 relative group';

  const badgeForItem = (item: NavItem) => {
    if (item.label === 'Alerts') return alertsUnreadCount;
    if (item.label === 'Admin Alerts') return adminAlertsUnreadCount;
    return 0;
  };

  const renderBadge = (count: number, compact = false) => {
    if (count <= 0) return null;
    return (
      <span
        className={cn(
          'inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white',
          compact && 'min-w-[8px] h-[8px] px-0',
        )}
      >
        {compact ? '' : count > 99 ? '99+' : count}
      </span>
    );
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    if (!item.visible) return null;

    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.label);
    const active = item.path
      ? isActivePath(location.pathname, item.path)
      : isActiveParent(location.pathname, item.children);

    if (hasChildren) {
      const chevron = expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />;
      const badgeCount = badgeForItem(item);
      const shouldShowParentBadge = isCollapsed || !expanded;
      return (
        <div key={item.label} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleExpand(item.label)}
            className={cn(
              itemBaseClass,
              'justify-between',
              active
                ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-slate-900 dark:text-white'
                : 'text-slate-700 dark:text-gray-200 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white',
              isCollapsed && 'justify-center px-2',
            )}
            title={item.label}
            aria-expanded={expanded}
          >
            {active && <span className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all" />}
            <div className={cn('flex items-center gap-2 min-w-0', isCollapsed && 'justify-center')}>
              <div className={cn('text-slate-500 dark:text-gray-300 relative', active && 'text-slate-900 dark:text-white')}>
                {item.icon}
                {isCollapsed && shouldShowParentBadge && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1">
                    {renderBadge(badgeCount, true)}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate" title={item.label}>
                    {item.label}
                  </span>
                  {shouldShowParentBadge ? renderBadge(badgeCount) : null}
                </div>
              )}
            </div>
            {!isCollapsed && <span className="text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-200">{chevron}</span>}
          </button>

          {expanded && !isCollapsed && (
            <div className="ml-3 pl-3 border-l border-slate-300 dark:border-white/10 space-y-1 submenu-enter">
              {item.children?.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    const badgeCount = badgeForItem(item);
    return (
      <Link
        key={item.label}
        to={item.path || '#'}
        className={cn(
          itemBaseClass,
          'nav-item-enter',
          isChild ? 'text-sm pl-8 pr-3 py-2' : '',
          active
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
            : 'text-slate-700 dark:text-gray-200 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white',
          isCollapsed && 'justify-center px-2',
        )}
        title={item.label}
        aria-current={active ? 'page' : undefined}
      >
        {active && <span className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all" />}
        <div className={cn('text-slate-500 dark:text-gray-300 relative', active && 'text-white')}>
          {item.icon}
          {isCollapsed && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1">
              {renderBadge(badgeCount, true)}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate" title={item.label}>
              {item.label}
            </span>
            {renderBadge(badgeCount)}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-white dark:bg-slate-900 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
        title={isMobileOpen ? 'Close menu' : 'Open menu'}
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileOpen}
        type="button"
      >
        {isMobileOpen ? <X className="h-6 w-6 text-gray-900 dark:text-slate-100" /> : <Menu className="h-6 w-6 text-gray-900 dark:text-slate-100" />}
      </button>
      <div className="lg:hidden fixed top-4 left-4 z-50 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-medium text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
        <span className="inline-flex items-center gap-1">
          <span>Isla Sakay</span>
          <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
          <Clock3 className="h-3 w-3" />
          <span>{mobilePhNowLabel} (PHT)</span>
        </span>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'flex flex-col h-full bg-gradient-to-b from-slate-100 to-white dark:from-[#181C24] dark:to-[#232A36] text-slate-900 dark:text-white font-inter transition-all duration-300 shadow-xl border-r border-slate-200 dark:border-slate-800',
          isCollapsed ? 'w-20' : 'w-80',
          'fixed lg:relative z-40 left-0 top-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div
          className={cn(
            'hidden lg:flex border-b border-slate-200 dark:border-white/10',
            isCollapsed ? 'flex-col items-center gap-2 px-3 py-4' : 'items-center justify-between px-4 py-4',
          )}
        >
          <Link
            to="/dashboard"
            className={cn('flex items-center gap-3', !isCollapsed && 'min-w-0')}
            title="Go to Dashboard"
          >
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Isla Sakay" className="h-12 w-12 flex-shrink-0 object-contain" />
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-lg tracking-tight truncate">Isla Sakay</h1>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium truncate">
                  {user?.role === 'super_admin' ? 'Super Admin Portal' : 'Admin Portal'}
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className={cn(
              'rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white',
              !isCollapsed && 'ml-2',
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-white/10 hidden lg:block">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-9 pl-9 bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-400 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        )}

        <nav
          className={cn('flex-1 p-4 space-y-2 overflow-y-auto sidebar-nav', isCollapsed ? 'pt-4' : '')}
          style={{ scrollbarGutter: 'stable', minHeight: 'calc(100vh - 120px)' }}
        >
          {filteredNavItems.length > 0 ? (
            filteredNavItems.map((item) => renderNavItem(item))
          ) : (
            <div className="text-center text-slate-500 dark:text-gray-400 text-sm py-6">No results found</div>
          )}
        </nav>

        <div className="w-full border-t border-slate-200 dark:border-white/10" />
        <div className="border-t border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-[#181C24] lg:hidden">
          <div className="p-2 flex items-center gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0 shadow">
              <AvatarFallback>{user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate max-w-[140px]">{user?.username}</p>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-full p-1 hover:bg-white/10 transition-colors">
                  <ChevronDown className="h-4 w-4 text-slate-500 dark:text-gray-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/account" className="cursor-pointer flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="text-sm font-normal">Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-2 text-left bg-transparent border-none outline-none cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-normal">Reset demo</span>
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="px-2 py-3 flex flex-col items-center text-xs text-slate-500 dark:text-gray-400 border-t border-slate-300 dark:border-gray-700">
            <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Isla Sakay v1.0.0</span>
            <span className="mt-1">Powered by Isla Sakay</span>
            <Link to="/settings/about" className="mt-1 text-blue-300 hover:underline">Help & About</Link>
            <Link to="/home" className="mt-1 text-blue-300 hover:underline">Website preview</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default observer(Sidebar);
