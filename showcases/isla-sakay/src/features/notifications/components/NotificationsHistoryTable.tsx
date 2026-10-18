import { useMemo, useState } from 'react';
import { Activity, ArrowDownUp, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/EmptyState';
import { toEpochMs } from '@/lib/date-time';
import type { SystemHistoryItem } from '../types';
import { toTimestamp } from '../utils';

interface NotificationsHistoryTableProps {
  items: SystemHistoryItem[];
}

type AuditModule = 'all' | 'admin' | 'operator' | 'boat' | 'booking' | 'settings' | 'notification' | 'auth' | 'other';
type AuditEntity = 'all' | 'admin' | 'operator' | 'boat' | 'booking' | 'schedule' | 'barangay' | 'fare' | 'contact' | 'notification' | 'session' | 'other';

const toStartOfDay = (date: string) => new Date(`${date}T00:00:00`).getTime();
const toEndOfDay = (date: string) => new Date(`${date}T23:59:59.999`).getTime();

export default function NotificationsHistoryTable({ items }: NotificationsHistoryTableProps) {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'edit' | 'delete' | 'update'>('all');
  const [moduleFilter, setModuleFilter] = useState<AuditModule>('all');
  const [entityFilter, setEntityFilter] = useState<AuditEntity>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredItems = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    const base = items.map((item) => ({
      ...item,
      module: (item.moduleName || 'other').toLowerCase() as Exclude<AuditModule, 'all'>,
      entity: (item.entityName || 'other').toLowerCase() as Exclude<AuditEntity, 'all'>,
      createdMs: toEpochMs(item.createdAt),
    })).filter((item) => {
      const passesAction = actionFilter === 'all' || item.action === actionFilter;
      if (!passesAction) return false;
      const passesModule = moduleFilter === 'all' || item.module === moduleFilter;
      if (!passesModule) return false;
      const passesEntity = entityFilter === 'all' || item.entity === entityFilter;
      if (!passesEntity) return false;
      if (dateFrom && item.createdMs < toStartOfDay(dateFrom)) return false;
      if (dateTo && item.createdMs > toEndOfDay(dateTo)) return false;
      if (!loweredQuery) return true;
      return (
        item.username.toLowerCase().includes(loweredQuery) ||
        item.information.toLowerCase().includes(loweredQuery) ||
        item.action.toLowerCase().includes(loweredQuery) ||
        item.module.toLowerCase().includes(loweredQuery) ||
        item.entity.toLowerCase().includes(loweredQuery)
      );
    });

    return [...base].sort((a, b) => {
      const diff = a.createdMs - b.createdMs;
      return sortOrder === 'newest' ? -diff : diff;
    });
  }, [actionFilter, dateFrom, dateTo, entityFilter, items, moduleFilter, query, sortOrder]);

  const summary = useMemo(
    () => ({
      create: filteredItems.filter((item) => item.action === 'create').length,
      update: filteredItems.filter((item) => item.action === 'update' || item.action === 'edit').length,
      delete: filteredItems.filter((item) => item.action === 'delete').length,
      visible: filteredItems.length,
    }),
    [filteredItems],
  );

  return (
    <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
      <CardHeader className="border-b border-slate-200/70 pb-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>System-wide history of create, edit, delete, and update actions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              {summary.visible} visible
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              {summary.create} create
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {summary.update} update
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {summary.delete} delete
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'create', 'edit', 'delete', 'update'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={actionFilter === value ? 'default' : 'outline'}
                  onClick={() => setActionFilter(value)}
                  className="capitalize"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username or activity"
              className="w-full lg:w-72"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            >
              <ArrowDownUp className="mr-1 h-4 w-4" />
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={moduleFilter} onValueChange={(value) => setModuleFilter(value as AuditModule)}>
            <SelectTrigger>
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="boat">Boat</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as AuditEntity)}>
            <SelectTrigger>
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="boat">Boat</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
              <SelectItem value="barangay">Barangay</SelectItem>
              <SelectItem value="fare">Fare</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95">
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Information</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Activity}
                    title="No activity found"
                    description="No notification history matches your current filters."
                  />
                </TableCell>
              </TableRow>
            )}
            {filteredItems.map((item) => (
              <TableRow key={item.id} className="transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-900/70">
                <TableCell>{toTimestamp(item.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{item.module}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{item.entity}</Badge>
                </TableCell>
                <TableCell className="font-medium">{item.username}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.action}
                  </Badge>
                </TableCell>
                <TableCell>{item.information}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
