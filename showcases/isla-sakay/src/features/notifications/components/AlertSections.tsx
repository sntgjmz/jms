import { AlertTriangle, CloudLightning, PlusCircle, RadioTower } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/EmptyState';
import type { Notification } from '@/types/models';
import { toTimestamp } from '../utils';
import { cn } from '@/lib/utils';

interface AdminAlertsSectionProps {
  generalAlerts: Notification[];
  weatherAlerts: Notification[];
  onOpenGeneralModal: () => void;
  onOpenBroadcastModal: () => void;
  onOpenWeatherModal: () => void;
  onEdit: (input: {
    id: string;
    type: 'system' | 'weather' | 'coast_guard';
    title: string;
    message: string;
    priority: string;
  }) => void;
  onDelete: (id: string, label: string) => void;
}

export function AdminAlertsSection({
  generalAlerts,
  weatherAlerts,
  onOpenGeneralModal,
  onOpenBroadcastModal,
  onOpenWeatherModal,
  onEdit,
  onDelete,
}: AdminAlertsSectionProps) {
  const allAlerts = [...generalAlerts, ...weatherAlerts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    all: allAlerts.length,
    general: generalAlerts.length,
    weather: weatherAlerts.length,
    critical: allAlerts.filter((alert) => alert.priority === 'critical' || alert.priority === 'high').length,
  };

  const renderTable = (alerts: Notification[], typeLabel: 'General Alert' | 'Weather Alert' | 'All Alerts') => {
    if (alerts.length === 0) {
      return (
        <EmptyState
          icon={PlusCircle}
          title={`No ${typeLabel.toLowerCase()} yet`}
          description="Create an alert to start notifying users."
          action={{ label: 'Send Alert', onClick: typeLabel === 'Weather Alert' ? onOpenWeatherModal : onOpenGeneralModal }}
        />
      );
    }
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
        <div className="border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              {alerts.length} in queue
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {typeLabel}
            </span>
          </div>
        </div>
        <div className="max-h-[560px] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => {
              const mappedType = alert.type === 'weather' ? 'Weather Alert' : 'General Alert';
              return (
                <TableRow key={alert.id} className="transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-900/70">
                  <TableCell>
                    <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      {mappedType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{alert.title}</TableCell>
                  <TableCell className="max-w-[360px] truncate" title={alert.message}>{alert.message}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'capitalize',
                        alert.priority === 'critical' || alert.priority === 'high'
                          ? 'border border-rose-500/20 bg-rose-500/10 text-rose-200'
                          : alert.priority === 'medium'
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                            : 'border border-sky-500/20 bg-sky-500/10 text-sky-200',
                      )}
                    >
                      {alert.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{toTimestamp(alert.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onEdit({
                            id: alert.id,
                            type: alert.type as 'system' | 'weather' | 'coast_guard',
                            title: alert.title,
                            message: alert.message,
                            priority: alert.priority,
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(alert.id, mappedType)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
      <CardHeader className="border-b border-slate-200/70 pb-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Admin Alerts</CardTitle>
            <CardDescription>General and weather broadcasts in one operational queue</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              {stats.all} total
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              {stats.general} general
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {stats.weather} weather
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {stats.critical} urgent
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all-alerts">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
            <TabsTrigger value="all-alerts" className="rounded-xl py-2">All Alerts</TabsTrigger>
            <TabsTrigger value="general-alerts" className="rounded-xl py-2">General Alerts</TabsTrigger>
            <TabsTrigger value="weather-alerts" className="rounded-xl py-2">Weather Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="all-alerts" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={onOpenGeneralModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Send General
              </Button>
              <Button onClick={onOpenBroadcastModal} variant="secondary">
                <RadioTower className="h-4 w-4 mr-2" />
                Broadcast Mobile
              </Button>
              <Button onClick={onOpenWeatherModal} variant="outline">
                <CloudLightning className="h-4 w-4 mr-2" />
                Send Weather
              </Button>
            </div>
            {renderTable(allAlerts, 'All Alerts')}
          </TabsContent>

          <TabsContent value="general-alerts" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={onOpenGeneralModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Send Alert
              </Button>
              <Button onClick={onOpenBroadcastModal} variant="secondary">
                <RadioTower className="h-4 w-4 mr-2" />
                Broadcast Mobile
              </Button>
            </div>
            {renderTable(generalAlerts, 'General Alert')}
          </TabsContent>

          <TabsContent value="weather-alerts" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={onOpenWeatherModal}>
                <CloudLightning className="h-4 w-4 mr-2" />
                Send Alert
              </Button>
            </div>
            {renderTable(weatherAlerts, 'Weather Alert')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface CalamityAlertsSectionProps {
  calamityAlerts: Notification[];
  onOpenCalamityModal: () => void;
  onEdit: (input: {
    id: string;
    type: 'system' | 'weather' | 'coast_guard';
    title: string;
    message: string;
    priority: string;
  }) => void;
  onDelete: (id: string, label: string) => void;
}

export function CalamityAlertsSection({
  calamityAlerts,
  onOpenCalamityModal,
  onEdit,
  onDelete,
}: CalamityAlertsSectionProps) {
  return (
    <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
      <CardHeader className="border-b border-slate-200/70 pb-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Calamity Alerts</CardTitle>
            <CardDescription>Critical broadcast desk for signal-based emergency communication</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {calamityAlerts.length} total
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Critical queue
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={onOpenCalamityModal}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Send Alert
          </Button>
        </div>
        {calamityAlerts.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No calamity alerts yet"
            description="Critical calamity broadcasts will appear here."
            action={{ label: 'Send Alert', onClick: onOpenCalamityModal }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-red-300/60 dark:border-red-700/50">
            <div className="border-b border-red-200/60 bg-red-50/70 px-4 py-3 dark:border-red-800/60 dark:bg-red-950/20">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-slate-950 dark:text-rose-200">
                  {calamityAlerts.length} alerts
                </span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  High urgency
                </span>
              </div>
            </div>
            <div className="max-h-[560px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-red-50/95 dark:bg-red-950/25">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calamityAlerts.map((alert) => (
                  <TableRow key={alert.id} className="transition-colors hover:bg-rose-50/60 dark:hover:bg-rose-950/10">
                    <TableCell>
                      <Badge variant="destructive">Calamity</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{alert.title}</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={alert.message}>{alert.message}</TableCell>
                    <TableCell><Badge variant="destructive">critical</Badge></TableCell>
                    <TableCell>{toTimestamp(alert.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onEdit({
                              id: alert.id,
                              type: 'coast_guard',
                              title: alert.title,
                              message: alert.message,
                              priority: alert.priority,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(alert.id, 'Calamity Alert')}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
