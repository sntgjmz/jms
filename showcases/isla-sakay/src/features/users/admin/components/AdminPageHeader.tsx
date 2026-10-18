import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';

interface AdminPageHeaderProps {
  isLoaded: boolean;
  onNewAdmin: () => void;
}

export const AdminPageHeader = ({ isLoaded, onNewAdmin }: AdminPageHeaderProps) => {
  return (
    <div className={`mb-6 transition-all duration-500 ${isLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Admin Management
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">Create and manage admin accounts for system access</p>
        </div>
        <Button
          onClick={onNewAdmin}
          className="gap-2 bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          New Admin
        </Button>
      </div>
    </div>
  );
};
