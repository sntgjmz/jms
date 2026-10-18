import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/contexts/AuthContext';
import { useBoatStore, useBookingStore } from '@/stores';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  ImageIcon,
  Package,
  Search,
  ShieldCheck,
  Ship,
  Smartphone,
  Wallet,
  XCircle,
} from 'lucide-react';
import { formatDateTimeOrFallback, formatRelativeTimeOrFallback, toEpochMs } from '@/lib/date-time';
import { formatCurrency } from '@/lib/helpers';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { cn } from '@/lib/utils';

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending Payment',
  for_verification: 'For Verification',
  for_cash_collection: 'For Cash Collection',
  confirmed: 'Confirmed',
  payment_rejected: 'Payment Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const statusBadgeClass: Record<string, string> = {
  pending_payment: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
  for_verification: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200',
  for_cash_collection: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200',
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
  payment_rejected: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  completed: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200',
};

type VerificationQueueItem = {
  id: string;
  bookingType: 'person' | 'cargo';
  bookingLabel: string;
  customer: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  paymentProofImageUrl?: string | null;
  submittedAt?: string | null;
  status: string;
};

const PaymentVerificationPage = observer(() => {
  const bookingStore = useBookingStore();
  const boatStore = useBoatStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'person' | 'cargo'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofDialogValue, setProofDialogValue] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<VerificationQueueItem | null>(null);

  const loadVerificationQueue = useCallback(
    () => Promise.all([bookingStore.fetchPersonBookings(), bookingStore.fetchCargoBookings(), boatStore.fetchBoats()]).then(() => undefined),
    [boatStore, bookingStore],
  );

  useAutoRefresh(loadVerificationQueue, [loadVerificationQueue], { intervalMs: 5000 });

  const queue = useMemo<VerificationQueueItem[]>(() => {
    const person: VerificationQueueItem[] = bookingStore.personBookings
      .filter((booking) => ['pending_payment', 'for_verification', 'for_cash_collection'].includes(booking.status))
      .map((booking) => ({
        id: booking.id,
        bookingType: 'person',
        bookingLabel: booking.id,
        customer: booking.passengerName,
        amount: booking.totalAmount,
        paymentMethod: booking.paymentMethod ?? 'cash',
        paymentReference: booking.paymentReference,
        paymentProofImageUrl: booking.paymentProofImageUrl,
        submittedAt: booking.createdAt,
        status: booking.status,
      }));

    const cargo: VerificationQueueItem[] = bookingStore.cargoBookings
      .filter((booking) => ['pending_payment', 'for_verification', 'for_cash_collection'].includes(booking.status))
      .map((booking) => ({
        id: booking.id,
        bookingType: 'cargo',
        bookingLabel: booking.id,
        customer: booking.senderName,
        amount: booking.totalAmount,
        paymentMethod: booking.paymentMethod ?? 'cash',
        paymentReference: booking.paymentReference,
        paymentProofImageUrl: booking.paymentProofImageUrl,
        submittedAt: booking.createdAt,
        status: booking.status,
      }));

    return [...person, ...cargo].sort((a, b) => toEpochMs(b.submittedAt) - toEpochMs(a.submittedAt));
  }, [bookingStore.cargoBookings, bookingStore.personBookings]);

  const visibleQueue = useMemo(() => {
    if (activeTab === 'person') {
      return queue.filter((item) => item.bookingType === 'person');
    }
    if (activeTab === 'cargo') {
      return queue.filter((item) => item.bookingType === 'cargo');
    }
    return queue;
  }, [activeTab, queue]);

  const filteredQueue = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleQueue;
    return visibleQueue.filter((item) =>
      [item.bookingLabel, item.customer, item.paymentMethod, item.paymentReference ?? '', item.paymentProofImageUrl ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, visibleQueue]);

  const verifiedToday = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    return [...bookingStore.personBookings, ...bookingStore.cargoBookings].filter((booking) => {
      if (booking.status !== 'confirmed' && booking.status !== 'completed') return false;
      return booking.verifiedAt?.slice(0, 10) === today;
    }).length;
  }, [bookingStore.cargoBookings, bookingStore.personBookings]);

  const pendingAmount = filteredQueue.reduce((sum, item) => sum + item.amount, 0);

  const tabCounts = useMemo(
    () => ({
      all: queue.length,
      person: queue.filter((item) => item.bookingType === 'person').length,
      cargo: queue.filter((item) => item.bookingType === 'cargo').length,
    }),
    [queue],
  );

  const recentActivity = useMemo(() => {
    return [...bookingStore.personBookings, ...bookingStore.cargoBookings]
      .filter((booking) => booking.verifiedAt)
      .sort((a, b) => toEpochMs(b.verifiedAt) - toEpochMs(a.verifiedAt))
      .slice(0, 8)
      .map((booking) => ({
        id: booking.id,
        message: `${booking.id} payment ${booking.paymentStatus === 'verified' ? 'approved' : 'rejected'}.`,
        createdAt: booking.verifiedAt ?? booking.createdAt,
        eventType: 'payment_verified',
        entityType: 'booking',
        actor: booking.verifiedBy ?? 'admin',
      }));
  }, [bookingStore.cargoBookings, bookingStore.personBookings]);

  const handleDecision = async (id: string, type: 'person' | 'cargo', approved: boolean, reason?: string) => {
    setProcessingId(id);
    await bookingStore.verifyBookingPayment(id, type, approved, user?.username ?? 'admin', reason);
    await boatStore.fetchBoats();
    setProcessingId(null);
  };

  const openRejectDialog = (payment: VerificationQueueItem) => {
    setRejectTarget(payment);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const canRenderImage = (value: string) =>
    value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/');

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.45fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <Badge className="w-fit border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Verification Desk
            </Badge>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Payment Verification</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Pending payment queue
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Pending</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{filteredQueue.length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Verified Today</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{verifiedToday}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-blue-200/70 bg-blue-50/90 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">Pending Amount</p>
              <p className="mt-1 text-xl font-semibold text-blue-900 dark:text-blue-50">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),320px]">
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader className="border-b border-slate-200/70 pb-3 dark:border-slate-800">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Verification Queue</CardTitle>
                  <CardDescription className="mt-0.5">
                    {filteredQueue.length} transaction{filteredQueue.length === 1 ? '' : 's'} awaiting a decision
                  </CardDescription>
                </div>
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search booking, user, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white pl-10 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'person' | 'cargo')} className="mb-4">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900 md:w-[380px]">
                  <TabsTrigger value="all" className="rounded-xl py-2">All ({tabCounts.all})</TabsTrigger>
                  <TabsTrigger value="person" className="rounded-xl py-2">Boat ({tabCounts.person})</TabsTrigger>
                  <TabsTrigger value="cargo" className="rounded-xl py-2">Cargo ({tabCounts.cargo})</TabsTrigger>
                </TabsList>
              </Tabs>

              {filteredQueue.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-base font-medium text-slate-700 dark:text-slate-200">No pending payments in this view.</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Switch tabs or wait for a new payment submission.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueue.map((payment) => {
                    const isProcessing = processingId === payment.id;
                    const bookingTypeLabel = payment.bookingType === 'person' ? 'Boat' : 'Cargo';
                    const proofAvailable = payment.paymentMethod === 'gcash' && Boolean(payment.paymentProofImageUrl);

                    return (
                      <div
                        key={payment.id}
                        className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-sm transition-colors dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))]"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn('border px-3 py-1 text-xs', statusBadgeClass[payment.status] ?? statusBadgeClass.pending_payment)}>
                                {statusLabel[payment.status] ?? payment.status}
                              </Badge>
                              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                                {bookingTypeLabel}
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400" title={formatDateTimeOrFallback(payment.submittedAt)}>
                                Submitted {formatRelativeTimeOrFallback(payment.submittedAt)}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Booking {payment.bookingLabel}
                              </p>
                              <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-slate-100">{payment.customer}</h3>
                            </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                              <div className="flex h-9 min-w-[120px] items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100">
                                  {payment.paymentMethod === 'gcash' ? <Smartphone className="h-3.5 w-3.5 text-sky-500" /> : <Wallet className="h-3.5 w-3.5 text-emerald-500" />}
                                  {payment.paymentMethod.toUpperCase()}
                              </div>
                              <div className="flex h-9 min-w-[120px] items-center rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-50">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="flex h-9 min-w-[160px] items-center rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100">
                                <span className="truncate">
                                  {payment.paymentReference?.trim() || 'No reference'}
                                </span>
                              </div>
                              <div className="flex h-9 min-w-[130px] items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100">
                                  <ImageIcon className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                  {payment.paymentMethod === 'cash' ? 'Not required' : proofAvailable ? 'Available' : 'Missing'}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {payment.paymentMethod === 'gcash' ? 'GCash payment review' : 'Cash collection review'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {payment.paymentMethod === 'gcash' ? (
                                  <Button
                                    variant="outline"
                                    className="h-9 rounded-xl"
                                    disabled={!proofAvailable}
                                    onClick={() => {
                                      setProofDialogValue(payment.paymentProofImageUrl ?? null);
                                      setProofDialogOpen(true);
                                    }}
                                  >
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    {proofAvailable ? 'Open Payment Proof' : 'Proof Missing'}
                                  </Button>
                                ) : (
                                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                                    Cash booking: no proof image required.
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                  disabled={isProcessing}
                                  onClick={() => void handleDecision(payment.id, payment.bookingType, true)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {isProcessing ? 'Processing...' : 'Approve Payment'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-9 rounded-xl"
                                  disabled={isProcessing}
                                  onClick={() => openRejectDialog(payment)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {isProcessing ? 'Processing...' : 'Reject Payment'}
                                </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Queue Breakdown</CardTitle>
              <CardDescription>Pending work by booking type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-900 p-2 text-white dark:bg-slate-100 dark:text-slate-900">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">All queue</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Everything awaiting verification</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tabCounts.all}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      <Ship className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Boat bookings</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Passenger payment queue</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tabCounts.person}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Cargo bookings</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Cargo payment queue</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tabCounts.cargo}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Recent Activity</CardTitle>
              <CardDescription>Latest verification decisions recorded by the system</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">{entry.message}</p>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400" title={formatDateTimeOrFallback(entry.createdAt)}>
                          {formatRelativeTimeOrFallback(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {entry.eventType} | {entry.entityType} | {entry.actor}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {!proofDialogValue ? (
            <p className="text-sm text-gray-500">No screenshot provided.</p>
          ) : canRenderImage(proofDialogValue) ? (
            <img src={proofDialogValue} alt="Payment proof" className="max-h-[70vh] w-full rounded border object-contain" />
          ) : (
            <div className="rounded border p-3">
              <p className="text-sm text-gray-700 dark:text-slate-200">{proofDialogValue}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                This proof is a text/link value and cannot be rendered as an image preview.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-lg rounded-[28px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Provide a short reason so the customer knows what to fix. This will appear in their
              rejection notification.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Example: Screenshot is blurry. Please re-upload a clear receipt."
              className="min-h-[120px] rounded-2xl border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={async () => {
                  if (!rejectTarget) return;
                  await handleDecision(rejectTarget.id, rejectTarget.bookingType, false, rejectReason);
                  setRejectDialogOpen(false);
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Reject with Reason
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

export default PaymentVerificationPage;
