import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useBoatStore } from '@/stores';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { ClipboardCheck } from 'lucide-react';

const normalizeStatus = (value?: string) => (value ? value.replaceAll('_', ' ') : 'n/a');
const formatRoutes = (routes?: string[]) => (routes && routes.length > 0 ? routes.join(', ') : 'No routes assigned');
const formatOperators = (boat: { operatorNames?: string[]; operatorName: string }) =>
  boat.operatorNames && boat.operatorNames.length > 0 ? boat.operatorNames.join(', ') : boat.operatorName;

const CurrentAvailabilityPage = observer(() => {
  const boatStore = useBoatStore();

  useAutoRefresh(() => boatStore.fetchBoats(), [boatStore], { intervalMs: 5000 });

  const availablePassengerBoats = useMemo(
    () =>
      boatStore.boats.filter(
        (boat) =>
          (boat.type === 'banca' || boat.type === 'passenger') &&
          boat.status === 'registered' &&
          (boat.availableSeats ?? boat.capacity) > 0,
      ),
    [boatStore.boats],
  );

  const availableCargoBoats = useMemo(
    () =>
      boatStore.boats.filter(
        (boat) =>
          boat.type === 'cargo' &&
          boat.status === 'registered' &&
          boat.cargoTripStatus !== 'maintenance' &&
          boat.cargoTripStatus !== 'cancelled',
      ),
    [boatStore.boats],
  );

  const totalAvailableBoats = availablePassengerBoats.length + availableCargoBoats.length;

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Availability Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Current Availability</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Live view of vessels currently ready for passenger and cargo operations</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Available</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{totalAvailableBoats}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Passenger</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{availablePassengerBoats.length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Cargo</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{availableCargoBoats.length}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Availability Table</CardTitle>
            <CardDescription>Read-only operational view for current ready vessels</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <CardContent className="p-4">
          <Tabs defaultValue="passenger" className="space-y-4">
            <TabsList className="grid h-10 w-full grid-cols-2 md:w-[320px]">
              <TabsTrigger value="passenger">Passenger</TabsTrigger>
              <TabsTrigger value="cargo">Cargo</TabsTrigger>
            </TabsList>

            <TabsContent value="passenger" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Boat Name</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Operator</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Routes</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Seats Left</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Trip Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availablePassengerBoats.map((boat) => (
                    <TableRow key={boat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="px-4 py-2.5 font-medium">
                        <Link to="/boats/management" className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-300" title="Open Boat Management">
                          {boat.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">{formatOperators(boat)}</TableCell>
                      <TableCell className="px-4 py-2.5">{formatRoutes(boat.routeNames)}</TableCell>
                      <TableCell className="px-4 py-2.5">{boat.availableSeats ?? boat.capacity}</TableCell>
                      <TableCell className="px-4 py-2.5"><Badge variant="secondary">{normalizeStatus(boat.bancaTripStatus ?? 'preparing')}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {availablePassengerBoats.length === 0 && <EmptyStateRow colSpan={5} message="No passenger boats are currently available." />}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="cargo" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Boat Name</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Operator</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Routes</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Weight Limit</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Trip Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableCargoBoats.map((boat) => (
                    <TableRow key={boat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="px-4 py-2.5 font-medium">
                        <Link to="/boats/management" className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-300" title="Open Boat Management">
                          {boat.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">{formatOperators(boat)}</TableCell>
                      <TableCell className="px-4 py-2.5">{formatRoutes(boat.routeNames)}</TableCell>
                      <TableCell className="px-4 py-2.5">{boat.capacity} kg</TableCell>
                      <TableCell className="px-4 py-2.5"><Badge variant="secondary">{normalizeStatus(boat.cargoTripStatus ?? 'preparing')}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {availableCargoBoats.length === 0 && <EmptyStateRow colSpan={5} message="No cargo boats are currently available." />}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  );
});

export default CurrentAvailabilityPage;
