import type { ReactNode } from 'react';

import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import Breadcrumbs from './Breadcrumbs';
import { LoadingIndicator } from './LoadingIndicator';
import SystemStatusBar from './SystemStatusBar';
import { cn } from '@/lib/utils';
import PortfolioDemoBanner from './PortfolioDemoBanner';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <LoadingIndicator />
      <Sidebar />
      <div className="portfolio-demo-main flex-1 flex flex-col min-w-0">
        <TopNavBar />
        <PortfolioDemoBanner />
        <SystemStatusBar />
        <main id="main-content" tabIndex={-1} className={cn("flex-1 overflow-auto focus:outline-none")}>
          <div className={cn("p-6 lg:ml-0", className)}>
            <Breadcrumbs />
            <div className="animate-fadeIn">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
