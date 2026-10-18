import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { BoatOperator } from '@/types/models';
import { ChevronRight, Search, Ship, Trash2, Users } from 'lucide-react';

interface BoatOperatorsTableCardProps {
  operators: BoatOperator[];
  filteredOperators: BoatOperator[];
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  activeCount: number;
  inactiveCount: number;
  hasFilters: boolean;
  fetchError: string | null;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  onOpenDetails: (operatorId: string) => void;
  onOpenDeleteConfirm: (operator: BoatOperator) => void;
  onAddOperator: () => void;
  onToggleStatus: (operator: BoatOperator) => void;
}

export const BoatOperatorsTableCard = ({
  operators,
  filteredOperators,
  searchTerm,
  statusFilter,
  activeCount,
  inactiveCount,
  hasFilters,
  fetchError,
  onSearchChange,
  onStatusFilterChange,
  onOpenDetails,
  onOpenDeleteConfirm,
  onAddOperator,
  onToggleStatus,
}: BoatOperatorsTableCardProps) => {
  return (
    <Card className="shadow-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 border-b dark:border-slate-700">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Boat Operator Accounts
            </CardTitle>
            <CardDescription>{filteredOperators.length} registered operators</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as typeof statusFilter)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs text-blue-700 dark:text-blue-200">
              <span className="font-semibold">Total</span>
              <span>{operators.length}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200"
            onClick={() => onStatusFilterChange('active')}
          >
            Active {activeCount}
          </button>
          <button
            type="button"
            className="rounded-full border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200"
            onClick={() => onStatusFilterChange('inactive')}
          >
            Inactive {inactiveCount}
          </button>
          {hasFilters && (
            <button
              type="button"
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {fetchError && (
          <div className="m-4 rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-200">
            {fetchError}
          </div>
        )}
        {filteredOperators.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Ship}
              title="No Boat Operators Yet"
              description="Start by adding your first boat operator to the system. You can manage their licenses, boats, and contact information."
              action={{
                label: 'Add First Operator',
                onClick: onAddOperator,
              }}
            />
          </div>
        ) : (
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-10">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Online</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right w-[220px]">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperators.map((operator, index) => (
                  <TableRow
                    key={operator.id}
                    className="h-12 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-all duration-300 border-b dark:border-slate-700 hover:border-l-4 hover:border-l-blue-300"
                    onClick={() => onOpenDetails(operator.id)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                  <TableCell className="font-medium">{operator.username || '-'}</TableCell>
                  <TableCell className="text-gray-600 dark:text-slate-300">{operator.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-slate-300">{operator.operatorType || '-'}</TableCell>
                  <TableCell>
                      <Badge
                        className={cn(
                          'font-semibold',
                          operator.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/40'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/40'
                        )}
                      >
                        {operator.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center"
                        aria-label={operator.isOnline ? 'Online' : 'Offline'}
                        title={operator.isOnline ? 'Online' : 'Offline'}
                      >
                        <span
                          className={cn(
                            'h-3 w-3 rounded-full animate-pulse',
                            operator.isOnline
                              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)] dark:bg-emerald-400'
                              : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.85)] dark:bg-rose-400'
                          )}
                        />
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">
                      {formatDateOrFallback(operator.lastLoginAt, 'Never')}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(operator.id);
                          }}
                          className="gap-2 h-9 min-w-[84px] justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(operator);
                          }}
                          className="gap-2 h-9 min-w-[96px] justify-center"
                        >
                          {operator.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDeleteConfirm(operator);
                          }}
                          className="gap-2 h-9 min-w-[88px] justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {filteredOperators.length > 0 && (
          <p className="mt-3 px-4 pb-3 text-xs text-slate-500">Tip: Click a row to view details.</p>
        )}
      </CardContent>
    </Card>
  );
};
