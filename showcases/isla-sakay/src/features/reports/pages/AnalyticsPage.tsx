import { useState } from 'react';
import Layout from '@/components/Layout';
import { reportsAPI, type AnalyticsReportDTO } from '@/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useAutoRefresh(async () => {
    try {
      setError(null);
      const data = await reportsAPI.getAnalyticsReport();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics report.');
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
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Revenue Analytics</h1>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Advanced revenue insights and forecasting</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Avg / Day</p>
                <p className="mt-1 text-lg font-semibold text-sky-900 dark:text-sky-50">{peso(report?.avgRevenuePerDay ?? 0)}</p>
              </div>
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Forecast</p>
                <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-50">{peso(report?.forecastNextMonth ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avg. Revenue/Day</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{peso(report?.avgRevenuePerDay ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Growth Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">+{report?.growthRate ?? 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Route</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-purple-600">{report?.topRoute ?? 'N/A'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{peso(report?.forecastNextMonth ?? 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Next month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics Dashboard</CardTitle>
            <CardDescription>Predictive analytics and business intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Live counters are now database-backed.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
