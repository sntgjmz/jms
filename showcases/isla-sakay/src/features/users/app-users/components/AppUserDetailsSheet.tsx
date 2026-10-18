import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateTimeOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { Copy, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';
import type { AppUserAccount } from '@/api/appUserService';

interface AppUserDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppUser: AppUserAccount | null;
  onCopy: (label: string, value: string) => void;
}

export const AppUserDetailsSheet = ({ open, onOpenChange, selectedAppUser, onCopy }: AppUserDetailsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:max-w-[760px]">
        {!selectedAppUser ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Users className="h-10 w-10 text-slate-500" />
            <SheetTitle className="mt-4">User details</SheetTitle>
            <SheetDescription className="mt-2">Select a user from the table to view details.</SheetDescription>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto px-6 pb-6">
            <SheetHeader className="border-b border-slate-800 px-0 pb-4 pt-6 text-left">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedAppUser.profilePictureUrl} alt={selectedAppUser.fullName} />
                  <AvatarFallback className="border border-sky-500/30 bg-sky-500/12 text-sky-200 font-semibold">
                    {selectedAppUser.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-xl text-white">{selectedAppUser.fullName}</SheetTitle>
                  <SheetDescription
                    className="break-all text-slate-300"
                    title={selectedAppUser.email}
                  >
                    <button
                      type="button"
                      className="text-left text-slate-200 hover:text-slate-50 underline-offset-4 hover:underline"
                      onClick={() => onCopy('Email', selectedAppUser.email)}
                    >
                      {selectedAppUser.email}
                    </button>
                  </SheetDescription>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        'font-semibold',
                        selectedAppUser.status === 'active'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          : 'border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
                      )}
                    >
                      {selectedAppUser.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">App User Account</p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{selectedAppUser.fullName}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Mobile user
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                        {selectedAppUser.isOnline ? 'Online now' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Account State</p>
                  <p className="mt-1 font-semibold capitalize text-slate-100">{selectedAppUser.status}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedAppUser.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-400">Account creation</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                    <UserRound className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Last Login</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">{formatDateTimeOrFallback(selectedAppUser.lastLoginAt, 'Never')}</p>
                    <p className="mt-1 text-xs text-slate-400">Latest auth event</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-200">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Online Status</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">{selectedAppUser.isOnline ? 'Online now' : 'Offline'}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedAppUser.isOnline ? 'Live session detected' : `Last seen ${formatDateTimeOrFallback(selectedAppUser.lastSeenAt, 'N/A')}`}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                    <Users className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Contact</p>
                    <button
                      type="button"
                      className="mt-2 break-all text-left text-lg font-semibold text-slate-50 underline-offset-4 hover:text-white hover:underline"
                      title={selectedAppUser.email}
                      onClick={() => onCopy('Email', selectedAppUser.email)}
                    >
                      {selectedAppUser.email}
                    </button>
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  onClick={() => onCopy('Email', selectedAppUser.email)}
                >
                  <Copy className="h-4 w-4" />
                  Copy email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  onClick={() => onCopy('Google Subject ID', selectedAppUser.googleSub)}
                >
                  <Copy className="h-4 w-4" />
                  Copy Google ID
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Account Profile</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">User ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedAppUser.id}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Google Subject ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedAppUser.googleSub}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedAppUser.phone || 'Not provided'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Nickname</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedAppUser.nickname || 'Not provided'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">First Name</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedAppUser.firstName || 'Not provided'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm text-slate-400">Last Name</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedAppUser.lastName || 'Not provided'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:col-span-2">
                  <p className="text-sm text-slate-400">Profile Picture URL</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedAppUser.profilePictureUrl || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
