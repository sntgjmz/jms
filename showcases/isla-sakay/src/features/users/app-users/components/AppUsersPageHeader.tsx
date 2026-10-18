import { Users } from 'lucide-react';

interface AppUsersPageHeaderProps {
  isLoaded: boolean;
}

export const AppUsersPageHeader = ({ isLoaded }: AppUsersPageHeaderProps) => {
  return (
    <div className={`mb-6 transition-all duration-500 ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">View all application user accounts</p>
        </div>
      </div>
    </div>
  );
};
