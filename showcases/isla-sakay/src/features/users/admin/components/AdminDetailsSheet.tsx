import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateTimeOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { User } from '@/types/models';
import { Copy, Mail, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';

interface AdminDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAdmin: User | null;
  onCopy: (label: string, value: string) => void;
  onOpenPasswordModal: (admin: User) => void;
  onOpenConfirmModal: (action: 'deactivate' | 'activate' | 'delete', admin: User) => void;
  onOpenEditModal: (admin: User) => void;
}

export const AdminDetailsSheet = ({
  open,
  onOpenChange,
  selectedAdmin,
  onCopy,
  onOpenPasswordModal,
  onOpenConfirmModal,
  onOpenEditModal,
}: AdminDetailsSheetProps) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent side="right" className="w-full overflow-x-hidden overflow-y-auto border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:max-w-[760px]">
        {!selectedAdmin ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Users className="h-10 w-10 text-slate-500" />
            <SheetTitle className="mt-4">Admin details</SheetTitle>
            <SheetDescription className="mt-2">Select an admin from the table to view details.</SheetDescription>
          </div>
        ) : (
          <div className="space-y-4 overflow-x-hidden overflow-y-auto px-6 pb-6">
            <SheetHeader className="border-b border-slate-800 px-0 pb-4 pt-6 text-left">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="border border-sky-500/30 bg-sky-500/12 text-sky-200 font-semibold">
                    {selectedAdmin.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-xl text-white">{selectedAdmin.username}</SheetTitle>
                  <SheetDescription className="truncate text-slate-300">{selectedAdmin.email}</SheetDescription>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        'font-semibold',
                        selectedAdmin.status === 'active'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          : 'border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                      )}
                    >
                      {selectedAdmin.status}
                    </Badge>
                    <Badge className="border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">{selectedAdmin.role}</Badge>
                    {selectedAdmin.mustChangePassword && (
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
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">Admin Account</p>
                      <h3 className="mt-1 break-words text-2xl font-semibold tracking-tight text-white">{selectedAdmin.username}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {selectedAdmin.role}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                        {selectedAdmin.isOnline ? 'Online now' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="self-start rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left lg:min-w-[172px] lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Account State</p>
                  <p className="mt-1 font-semibold text-slate-100 capitalize">{selectedAdmin.status}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</p>
                    <p className="mt-2 break-words text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedAdmin.createdAt)}</p>
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
                    <p className="mt-2 break-words text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedAdmin.lastLoginAt, 'Never')}</p>
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
                    <p className="mt-2 text-lg font-semibold text-slate-50">
                      {selectedAdmin.isOnline ? 'Online now' : 'Offline'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedAdmin.isOnline ? 'Live session detected' : `Last seen ${formatDateTimeOrFallback(selectedAdmin.lastSeenAt, 'N/A')}`}
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
                    <p className="mt-2 break-all text-lg font-semibold text-slate-50">{selectedAdmin.email}</p>
                    <p className="mt-1 text-xs text-slate-400">Primary email</p>
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
                    onClick={() => onCopy('Email', selectedAdmin.email)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                    onClick={() => onCopy('Username', selectedAdmin.username)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy username
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                    onClick={() => onOpenPasswordModal(selectedAdmin)}
                  >
                    Change password
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                    onClick={() => onOpenEditModal(selectedAdmin)}
                  >
                    Edit details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800 sm:col-span-2"
                    onClick={() =>
                      onOpenConfirmModal(
                        selectedAdmin.status === 'active' ? 'deactivate' : 'activate',
                        selectedAdmin
                      )
                    }
                  >
                    {selectedAdmin.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>

            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => onOpenConfirmModal('delete', selectedAdmin)}
                disabled={selectedAdmin.role === 'super_admin'}
              >
                <Trash2 className="h-4 w-4" />
                Delete admin
              </Button>
              {selectedAdmin.role === 'super_admin' && (
                <p className="mt-2 text-xs text-slate-500">Super admins cannot be deleted.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
