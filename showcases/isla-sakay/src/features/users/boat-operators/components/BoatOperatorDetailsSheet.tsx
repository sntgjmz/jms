import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateTimeOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { BoatOperator } from '@/types/models';
import { Copy, Mail, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';

interface BoatOperatorDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOperator: BoatOperator | null;
  onToggleStatus: (operator: BoatOperator) => void;
  onDeleteRequest: (operator: BoatOperator) => void;
  onCopy: (label: string, value: string) => void;
  onOpenPasswordModal: (operator: BoatOperator) => void;
  onOpenEditModal: (operator: BoatOperator) => void;
}

export const BoatOperatorDetailsSheet = ({
  open,
  onOpenChange,
  selectedOperator,
  onToggleStatus,
  onDeleteRequest,
  onCopy,
  onOpenPasswordModal,
  onOpenEditModal,
}: BoatOperatorDetailsSheetProps) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent side="right" className="w-full overflow-x-hidden overflow-y-auto border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:max-w-[760px]">
        {!selectedOperator ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Users className="h-10 w-10 text-slate-500" />
            <SheetTitle className="mt-4">Operator details</SheetTitle>
            <SheetDescription className="mt-2">Select an operator to view details.</SheetDescription>
          </div>
        ) : (
          <div className="space-y-4 overflow-x-hidden overflow-y-auto px-6 pb-6">
            <SheetHeader className="border-b border-slate-800 px-0 pb-4 pt-6 text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200 font-semibold">
                  {selectedOperator.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-xl text-white">{selectedOperator.name}</SheetTitle>
                  <SheetDescription className="truncate text-slate-300">
                    {selectedOperator.email || 'No email provided'}
                  </SheetDescription>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        'font-semibold',
                        selectedOperator.status === 'active'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          : selectedOperator.status === 'inactive'
                            ? 'border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                            : 'border border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
                      )}
                    >
                      {selectedOperator.status}
                    </Badge>
                    {selectedOperator.mustChangePassword && (
                      <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20">
                        Requires password change
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">Boat Operator</p>
                      <h3 className="mt-1 break-words text-2xl font-semibold tracking-tight text-white">{selectedOperator.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {selectedOperator.operatorType || 'operator'}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                        {selectedOperator.isOnline ? 'Online now' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="self-start rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left lg:min-w-[172px] lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Account State</p>
                  <p className="mt-1 font-semibold capitalize text-slate-100">{selectedOperator.status}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</p>
                    <p className="mt-2 break-words text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedOperator.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-400">Account creation</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                    <UserRound className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Last Login</p>
                    <p className="mt-2 break-words text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedOperator.lastLoginAt, 'Never')}</p>
                    <p className="mt-1 text-xs text-slate-400">Latest auth event</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-200">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Online Status</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">{selectedOperator.isOnline ? 'Online now' : 'Offline'}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedOperator.isOnline ? 'Live session detected' : `Last seen ${formatDateTimeOrFallback(selectedOperator.lastSeenAt, 'N/A')}`}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                    <Users className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Contact</p>
                    <p className="mt-2 break-all text-lg font-semibold text-slate-50">{selectedOperator.email || selectedOperator.phone}</p>
                    <p className="mt-1 text-xs text-slate-400">{selectedOperator.email ? 'Primary email' : 'Primary phone'}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
                    <Mail className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quick Actions</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  disabled={!selectedOperator.email}
                  onClick={() => selectedOperator.email && onCopy('Email', selectedOperator.email)}
                >
                  <Copy className="h-4 w-4" />
                  Copy email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  disabled={!selectedOperator.username}
                  onClick={() => selectedOperator.username && onCopy('Username', selectedOperator.username)}
                >
                  <Copy className="h-4 w-4" />
                  Copy username
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  onClick={() => onOpenPasswordModal(selectedOperator)}
                >
                  Change password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  onClick={() => onOpenEditModal(selectedOperator)}
                >
                  Edit details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800 sm:col-span-2"
                  onClick={() => onToggleStatus(selectedOperator)}
                >
                  {selectedOperator.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operator Profile</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedOperator.phone}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">License Number</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-100">
                    {selectedOperator.licenseNumber || 'Not provided'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Operator Type</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">
                    {selectedOperator.operatorType || 'Not specified'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Birthday</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">
                    {selectedOperator.birthday || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="destructive" className="w-full" onClick={() => onDeleteRequest(selectedOperator)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete operator
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
