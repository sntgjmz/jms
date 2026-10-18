import { TableCell, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';

interface EmptyStateRowProps {
  colSpan: number;
  message?: string;
  icon?: React.ElementType;
}

export const EmptyStateRow = ({ colSpan, message = 'No records found.', icon: Icon = Search }: EmptyStateRowProps) => {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
          <Icon className="h-8 w-8 text-slate-300" />
          <p>{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
};