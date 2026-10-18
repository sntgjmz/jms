import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

interface BoatOperatorsHeaderProps {
  onAdd: () => void;
}

export const BoatOperatorsHeader = ({ onAdd }: BoatOperatorsHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Boat Operators
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">Manage boat operator accounts and licenses</p>
        </div>
        <Button className="gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Operator
        </Button>
      </div>
    </div>
  );
};
