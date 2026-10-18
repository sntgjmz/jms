import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingStore, useBoatStore, useNotificationStore } from '@/stores';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Ship,
  TrendingUp,
  TriangleAlert,
  Users,
  Waves,
} from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

type ReportFormat = 'pdf' | 'excel';

const DashboardPage = observer(() => {
  const { user } = useAuth();
  const bookingStore = useBookingStore();
  const boatStore = useBoatStore();
  const notificationStore = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);

  const unreadNotifications = notificationStore.unreadCount;
  const recentNotifications = notificationStore.getRecentNotifications(4);

  const recentBookingFeed = useMemo(() => {
    const passenger = bookingStore.personBookings.map((item) => ({
      id: item.id,
      bookingType: 'passenger' as const,
      title: item.passengerName,
      origin: item.origin,
      destination: item.destination,
      status: item.status,
      createdAt: item.createdAt,
      amount: Number(item.totalAmount) || 0,
    }));
    const cargo = bookingStore.cargoBookings.map((item) => ({
      id: item.id,
      bookingType: 'cargo' as const,
      title: `${item.senderName} to ${item.receiverName}`,
      origin: item.origin,
      destination: item.destination,
      status: item.status,
      createdAt: item.createdAt,
      amount: Number(item.totalAmount) || 0,
    }));

    return [...passenger, ...cargo]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [bookingStore.personBookings, bookingStore.cargoBookings]);

  const revenue = useMemo(() => {
    const passenger = bookingStore.personBookings.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
    const cargo = bookingStore.cargoBookings.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
    return {
      passenger,
      cargo,
      total: passenger + cargo,
    };
  }, [bookingStore.personBookings, bookingStore.cargoBookings]);

  const pendingVerification = useMemo(() => {
    const pendingStates = ['pending', 'pending_payment', 'for_verification', 'for_cash_collection'];
    const person = bookingStore.personBookings.filter((item) => pendingStates.includes(item.status)).length;
    const cargo = bookingStore.cargoBookings.filter((item) => pendingStates.includes(item.status)).length;
    return person + cargo;
  }, [bookingStore.personBookings, bookingStore.cargoBookings]);

  const fleetReadiness = useMemo(() => {
    const total = boatStore.boats.length || 1;
    const registered = boatStore.registeredBoats.length;
    const coding = boatStore.codingBoats.length;
    const maintenance = boatStore.nonRegisteredBoats.length;
    return {
      registeredPct: Math.round((registered / total) * 100),
      codingPct: Math.round((coding / total) * 100),
      maintenancePct: Math.round((maintenance / total) * 100),
    };
  }, [boatStore.boats.length, boatStore.registeredBoats.length, boatStore.codingBoats.length, boatStore.nonRegisteredBoats.length]);

  const stats = [
    {
      title: 'Passenger Bookings',
      value: bookingStore.personBookings.length,
      description: 'Processed passenger requests',
      tone: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
      icon: Users,
    },
    {
      title: 'Cargo Bookings',
      value: bookingStore.cargoBookings.length,
      description: 'Active cargo requests',
      tone: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      icon: Package,
    },
    {
      title: 'Fleet',
      value: boatStore.boats.length,
      description: 'Total registered vessels',
      tone: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      icon: Ship,
    },
    {
      title: 'Unread Alerts',
      value: unreadNotifications,
      description: 'Needs admin attention',
      tone: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
      icon: Bell,
    },
    {
      title: 'Pending Verifications',
      value: pendingVerification,
      description: 'Bookings waiting action',
      tone: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
      icon: Clock3,
    },
    {
      title: 'Gross Revenue',
      value: `P ${revenue.total.toFixed(0)}`,
      description: 'Passenger + cargo total',
      tone: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
      icon: TrendingUp,
    },
  ];

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    await Promise.all([
      bookingStore.fetchPersonBookings(),
      bookingStore.fetchCargoBookings(),
      boatStore.fetchBoats(),
      notificationStore.fetchNotifications(),
    ]);
    if (!silent) setLoading(false);
  }, [bookingStore, boatStore, notificationStore]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData(true), [loadData], { intervalMs: 5000 });

  const getReportLines = () => {
    const generatedAt = new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const passengerTotal = bookingStore.personBookings.reduce((sum, booking: any) => sum + (Number(booking?.totalAmount) || 0), 0);
    const cargoTotal = bookingStore.cargoBookings.reduce((sum, booking: any) => sum + (Number(booking?.totalAmount) || 0), 0);

    const topRoutes = [...recentBookingFeed]
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${item.origin} -> ${item.destination} (${item.bookingType})`);

    return [
      'Isla Sakay Dashboard Report',
      `Generated: ${generatedAt} (Asia/Manila)`,
      '',
      'Summary',
      `- Passenger bookings: ${bookingStore.personBookings.length}`,
      `- Cargo bookings: ${bookingStore.cargoBookings.length}`,
      `- Boats: ${boatStore.boats.length}`,
      `- Unread alerts: ${notificationStore.unreadCount}`,
      '',
      'Revenue',
      `- Passenger total amount: P ${passengerTotal.toFixed(2)}`,
      `- Cargo total amount: P ${cargoTotal.toFixed(2)}`,
      `- Grand total amount: P ${(passengerTotal + cargoTotal).toFixed(2)}`,
      '',
      'Recent Booking Routes',
      ...(topRoutes.length > 0 ? topRoutes : ['- No recent bookings']),
    ];
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const escapePdfText = (text: string) => text.replace(/[()\\]/g, '\\$&');

  const createSimplePdf = (lines: string[]) => {
    const content = [
      'BT',
      '/F1 12 Tf',
      '72 760 Td',
      '16 TL',
      ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ].join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return new Blob([pdf], { type: 'application/pdf' });
  };

  const downloadReport = async (format: ReportFormat) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setDownloadingFormat(format);

    try {
      if (format === 'excel') {
        const escapeHtml = (value: string) =>
          value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');

        const generatedAt = new Date().toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        const passengerTotal = bookingStore.personBookings.reduce((sum, booking: any) => sum + (Number(booking?.totalAmount) || 0), 0);
        const cargoTotal = bookingStore.cargoBookings.reduce((sum, booking: any) => sum + (Number(booking?.totalAmount) || 0), 0);
        const grandTotal = passengerTotal + cargoTotal;

        const summaryRows = [
          ['Metric', 'Value'],
          ['Generated', generatedAt],
          ['Passenger bookings', String(bookingStore.personBookings.length)],
          ['Cargo bookings', String(bookingStore.cargoBookings.length)],
          ['Boats', String(boatStore.boats.length)],
          ['Unread alerts', String(notificationStore.unreadCount)],
          ['Passenger total amount', `P ${passengerTotal.toFixed(2)}`],
          ['Cargo total amount', `P ${cargoTotal.toFixed(2)}`],
          ['Grand total amount', `P ${grandTotal.toFixed(2)}`],
        ];

        const recentRows = recentBookingFeed.slice(0, 12).map((item) => [
          item.bookingType,
          item.title,
          `${item.origin} -> ${item.destination}`,
          item.status,
          `P ${item.amount.toFixed(2)}`,
          new Date(item.createdAt).toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        ]);

        const summaryTable = summaryRows
          .map((row, index) => `
            <tr>
              ${row.map((cell) => `<td style="padding:8px;border:1px solid #cbd5e1;${index === 0 ? 'font-weight:700;background:#e2e8f0;' : ''}">${escapeHtml(String(cell))}</td>`).join('')}
            </tr>`)
          .join('');

        const recentTableHeader = ['Type', 'Name', 'Route', 'Status', 'Amount', 'Created']
          .map((cell) => `<th style="padding:8px;border:1px solid #cbd5e1;background:#e2e8f0;text-align:left;">${escapeHtml(cell)}</th>`)
          .join('');
        const recentTableBody = recentRows.length > 0
          ? recentRows.map((row) => `<tr>${row.map((cell) => `<td style="padding:8px;border:1px solid #cbd5e1;">${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="6" style="padding:8px;border:1px solid #cbd5e1;">No recent bookings</td></tr>`;

        const html = `
          <html>
            <head><meta charset="utf-8" /></head>
            <body style="font-family:Segoe UI,Arial,sans-serif; color:#0f172a;">
              <h2 style="margin:0 0 8px 0;">Isla Sakay Dashboard Report</h2>
              <p style="margin:0 0 14px 0;color:#475569;">Date: ${escapeHtml(todayIso)}</p>
              <table style="border-collapse:collapse; width:100%; margin-bottom:16px;">${summaryTable}</table>
              <h3 style="margin:0 0 8px 0;">Recent Booking Activity</h3>
              <table style="border-collapse:collapse; width:100%;">
                <thead><tr>${recentTableHeader}</tr></thead>
                <tbody>${recentTableBody}</tbody>
              </table>
            </body>
          </html>`;
        downloadBlob(
          new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }),
          `dashboard-report-${todayIso}.xls`
        );
      } else {
        downloadBlob(createSimplePdf(getReportLines()), `dashboard-report-${todayIso}.pdf`);
      }

      setShowRevenueModal(false);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 dark:border-blue-900/60 dark:from-[#0b1736] dark:via-[#0d1a3b] dark:to-[#10264b] dark:text-slate-100">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Isla Sakay" className="h-20 w-20 rounded-xl border border-cyan-400/40 object-contain bg-white" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-700/80 dark:text-cyan-200/80">ISLA SAKAY OPERATION</p>
                  <h1 className="text-2xl font-semibold">Dashboard</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                      {todayLabel}
                    </span>
                    <Badge className="border-cyan-300 bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/15">
                      {String(user?.role ?? 'admin').replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-200">
                      <TriangleAlert className="h-4 w-4" />
                      {unreadNotifications} unread
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20" onClick={() => setShowRevenueModal(true)}>
                  Generate report
                </Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400" asChild>
                  <Link to="/notifications">Open alerts</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-900 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${stat.tone}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Waves className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <h3 className="mt-1 text-2xl font-semibold">{stat.value}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {showRevenueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700/80 dark:text-cyan-300/80">Dashboard Export</p>
                <h2 className="mt-1 text-xl font-semibold">Generate report</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Download a formatted summary with current metrics and booking activity.</p>
              </div>
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 border-slate-200 bg-slate-50 py-3 text-left hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                  disabled={downloadingFormat !== null}
                  onClick={() => downloadReport('pdf')}
                >
                  {downloadingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-rose-500 dark:text-rose-300" />}
                  <span>
                    <span className="block font-semibold">PDF Report</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Printable summary document</span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 border-slate-200 bg-slate-50 py-3 text-left hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                  disabled={downloadingFormat !== null}
                  onClick={() => downloadReport('excel')}
                >
                  {downloadingFormat === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />}
                  <span>
                    <span className="block font-semibold">Excel Report</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Structured sheet for analysis</span>
                  </span>
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" disabled={downloadingFormat !== null} onClick={() => setShowRevenueModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-8 border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <CardHeader>
              <CardTitle>Live Booking Activity</CardTitle>
              <CardDescription>Most recent passenger and cargo events across all modules.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBookingFeed.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  No activity yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookingFeed.map((item) => (
                    <div key={`${item.bookingType}-${item.id}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${item.bookingType === 'passenger' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                          {item.bookingType === 'passenger' ? <Users className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.origin} to {item.destination}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {item.status}
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/15">
                          P {item.amount.toFixed(0)}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.createdAt).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 xl:col-span-4">
            <Card className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <CardHeader>
                <CardTitle>Fleet Readiness</CardTitle>
                <CardDescription>Quick condition of active vessels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Registered</span>
                    <span>{fleetReadiness.registeredPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${fleetReadiness.registeredPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Coding</span>
                    <span>{fleetReadiness.codingPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${fleetReadiness.codingPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Non registered</span>
                    <span>{fleetReadiness.maintenancePct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-rose-400" style={{ width: `${fleetReadiness.maintenancePct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Registered</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-300">{boatStore.registeredBoats.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total boats</p>
                    <p className="mt-1 text-lg font-semibold text-cyan-600 dark:text-cyan-300">{boatStore.boats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <CardHeader>
                <CardTitle>Alert Stream</CardTitle>
                <CardDescription>Critical and latest system signals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentNotifications.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    No alerts right now.
                  </div>
                )}
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                      <Badge
                        className={
                          notification.priority === 'critical'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/20'
                            : notification.priority === 'high'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/20'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                        }
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                  </div>
                ))}
                <Button variant="outline" className="w-full border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" asChild>
                  <Link to="/notifications">Open notification module</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <CardHeader>
              <CardTitle>Revenue Snapshot</CardTitle>
              <CardDescription>Computed from current booking records</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500">Passenger total</p>
                <p className="mt-2 text-xl font-semibold text-sky-600 dark:text-sky-300">P {revenue.passenger.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cargo total</p>
                <p className="mt-2 text-xl font-semibold text-amber-600 dark:text-amber-300">P {revenue.cargo.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="text-xs uppercase tracking-wide text-emerald-700/80 dark:text-emerald-200/80">Grand total</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-200">P {revenue.total.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <CardHeader>
              <CardTitle>Immediate Actions</CardTitle>
              <CardDescription>Fast links for operational checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" asChild>
                <Link to="/bookings/person">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                  Review passenger bookings
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" asChild>
                <Link to="/bookings/cargo">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-amber-500 dark:text-amber-300" />
                  Review cargo bookings
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" asChild>
                <Link to="/boats">
                  <Ship className="mr-2 h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                  Open fleet records
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {unreadNotifications > 0 && (
          <Card className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-300" />
                <CardTitle>Unread alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-amber-800/90 dark:text-amber-100/90">
                You have {unreadNotifications} unread alert{unreadNotifications !== 1 ? 's' : ''}.
              </p>
              <Button variant="outline" className="border-amber-300 bg-transparent text-amber-800 hover:bg-amber-100 dark:border-amber-300/40 dark:text-amber-100 dark:hover:bg-amber-500/20" asChild>
                <Link to="/notifications">Review now</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
});

export default DashboardPage;
