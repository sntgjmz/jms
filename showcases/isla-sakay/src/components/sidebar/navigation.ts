import type { NavItem } from '@/config/navigation';

export const isActivePath = (pathname: string, path: string) => {
  if (!path || path === '/') return pathname === path;
  return pathname === path;
};

export const isActiveParent = (pathname: string, children?: NavItem[]) => {
  return children?.some((child) => child.path && isActivePath(pathname, child.path));
};

export const filterNavItems = (navItems: NavItem[], searchQuery: string): NavItem[] => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return navItems;

  const matchesSearch = (text: string) => text.toLowerCase().includes(query);

  return navItems
    .map((item: NavItem) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child: NavItem) => matchesSearch(child.label));
        if (filteredChildren.length > 0 || matchesSearch(item.label)) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }
      return matchesSearch(item.label) ? item : null;
    })
    .filter(Boolean) as NavItem[];
};

export const deriveExpandedLabels = (
  navItems: NavItem[],
  filteredNavItems: NavItem[],
  searchQuery: string,
  pathname: string,
): Set<string> => {
  const derived = new Set<string>();

  const isActivePathForDerived = (path: string) => {
    if (pathname === path) return true;
    if (!path || path === '/') return false;
    return pathname.startsWith(`${path}/`);
  };

  navItems.forEach((item) => {
    if (item.children && item.children.some((child) => child.path && isActivePathForDerived(child.path))) {
      derived.add(item.label);
    }
  });

  if (searchQuery.trim()) {
    filteredNavItems.forEach((item) => {
      if (item.children && item.children.length > 0) derived.add(item.label);
    });
  }

  return derived;
};
