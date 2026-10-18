import { useState } from 'react';
import Layout from '@/components/Layout';
import { reportsAPI, type BancaReportDTO } from '@/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function BancaReportsPage() {
  const [report, setReport] = useState<BancaReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useAutoRefresh(async () => {
    try {
      setError(null);
      const data = await reportsAPI.getBancaReport();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banca report.');
    }
  }, [], { intervalMs: 7000 });

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
          <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
            <div className="space-y-2.5">
              <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                Report Desk
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Banca Reports</h1>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Vessel performance and operational reporting</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Active</p>
                <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{report?.activeBancas ?? 0}</p>
              </div>
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Trips Today</p>
                <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{report?.tripsToday ?? 0}</p>
              </div>
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Utilization</p>
                <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{report?.utilizationRate ?? 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Bancas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{report?.activeBancas ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trips Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{report?.tripsToday ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Utilization Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{report?.utilizationRate ?? 0}%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Banca Performance</CardTitle>
            <CardDescription>Trip statistics and vessel efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Live counters are now database-backed.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
