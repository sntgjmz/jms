import { AlertTriangle, ChevronRight, PlusCircle, RefreshCcw, Search, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { User } from '@/types/models';

interface AdminTableCardProps {
  admins: User[];
  filteredAdmins: User[];
  isLoaded: boolean;
  isFetching: boolean;
  fetchError: string | null;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  activeCount: number;
  inactiveCount: number;
  hasFilters: boolean;
  deleteAnimation: string | null;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  onRetry: () => void;
  onOpenDetails: (adminId: string) => void;
  onOpenConfirm: (action: 'deactivate' | 'activate' | 'delete', admin: User) => void;
  onOpenCreate: () => void;
}

export const AdminTableCard = ({
  admins,
  filteredAdmins,
  isLoaded,
  isFetching,
  fetchError,
  searchTerm,
  statusFilter,
  activeCount,
  inactiveCount,
  hasFilters,
  deleteAnimation,
  onSearchChange,
  onStatusFilterChange,
  onRetry,
  onOpenDetails,
  onOpenConfirm,
  onOpenCreate,
}: AdminTableCardProps) => {
  return (
    <Card className={`shadow-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 ${isLoaded ? 'animate-fade-in-up stagger-2' : 'opacity-0'}`}>
      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 border-b dark:border-slate-700">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Admin Accounts
            </CardTitle>
            <CardDescription>
              {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 transition-all duration-300 focus:border-green-500 focus:shadow-md"
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
                <span>{admins.length}</span>
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
        {fetchError && admins.length > 0 && (
          <div className="m-4 rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Some data may be outdated.</p>
               <p className="text-red-700 dark:text-red-200">{fetchError}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {fetchError && admins.length === 0 ? (
          <div className="p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="text-gray-900 dark:text-slate-100 text-lg font-semibold mt-4">Couldn't load admins</p>
            <p className="text-gray-600 dark:text-slate-300 mt-2">{fetchError}</p>
            <Button className="mt-6 gap-2" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : isFetching && admins.length === 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-56" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end items-center gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-900 dark:text-slate-100 text-lg font-semibold">No admins found</p>
            {searchTerm ? (
               <p className="text-gray-500 dark:text-slate-300 text-sm mt-2">Try adjusting your search terms.</p>
            ) : (
               <p className="text-gray-500 dark:text-slate-300 text-sm mt-2">Create your first admin account to manage access.</p>
            )}
            <p className="text-xs text-slate-500 mt-3">Tip: Click a row to view details.</p>
            {!searchTerm && (
              <Button className="mt-6 gap-2" onClick={onOpenCreate}>
                <PlusCircle className="h-4 w-4" />
                New Admin
              </Button>
            )}
          </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
                <Table>
                <TableHeader className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin, index) => (
                    <TableRow
                      key={admin.id}
                      className={`h-12 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-all duration-300 border-b dark:border-slate-700 hover:border-l-4 hover:border-l-blue-300 ${
                        deleteAnimation === admin.id ? 'animate-fade-out' : ''
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => onOpenDetails(admin.id)}
                    >
                    <TableCell className="font-semibold text-gray-900 dark:text-slate-100">{admin.username}</TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">{admin.email}</TableCell>
                    <TableCell>
                    <Badge
                      className={cn(
                        'font-semibold transition-all duration-300',
                        admin.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/40'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/40'
                      )}
                    >
                      {admin.status}
                    </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center"
                        aria-label={admin.isOnline ? 'Online' : 'Offline'}
                        title={admin.isOnline ? 'Online' : 'Offline'}
                      >
                        <span
                          className={cn(
                            'h-3 w-3 rounded-full animate-pulse',
                            admin.isOnline
                              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)] dark:bg-emerald-400'
                              : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.85)] dark:bg-rose-400'
                          )}
                        />
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-slate-300">
                      {formatDateOrFallback(admin.lastLoginAt, 'Never')}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex justify-end items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(admin.id);
                          }}
                          className="gap-2 h-9 min-w-[84px] justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConfirm(admin.status === 'active' ? 'deactivate' : 'activate', admin);
                          }}
                          className="gap-2 h-9 min-w-[96px] justify-center"
                        >
                          {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConfirm('delete', admin);
                          }}
                          className="gap-2 h-9 min-w-[88px] justify-center hover:scale-110 transition-transform duration-300"
                          disabled={admin.role === 'super_admin'}
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
              <p className="mt-3 px-4 pb-3 text-xs text-slate-500">Tip: Click a row to view details.</p>
            </>
          )}
      </CardContent>
    </Card>
  );
};
