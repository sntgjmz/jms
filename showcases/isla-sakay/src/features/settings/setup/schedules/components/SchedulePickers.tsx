import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Info } from 'lucide-react';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { Boat } from '@/types';
import type { Fare } from '@/stores/SettingsStore';

const formatDisplayBoatId = (id?: string) => {
  if (!id) return '-';
  if (id.startsWith('ISL-')) return id;
  const compact = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `ISL-${compact.slice(0, 6) || '000000'}`;
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

const calculateTotalFare = (fare: Fare) => {
  if (fare.type === 'cargo') return fare.rentalFare ?? 0;
  const base = fare.baseFare ?? 0;
  const pct = fare.percentagePerKilometer ?? 0;
  const dist = fare.distanceKm ?? 0;
  return base + (base * (pct / 100) * Math.max(dist - 1, 0));
};

interface BoatPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boats: Boat[];
  onSelect: (boat: Boat) => void;
}

export const BoatPickerDialog = ({ open, onOpenChange, boats, onSelect }: BoatPickerDialogProps) => {
  const [query, setQuery] = useState('');
  const [boatTab, setBoatTab] = useState<'banca' | 'cargo'>('banca');

  useEffect(() => {
    if (open) {
      setQuery('');
      setBoatTab('banca');
    }
  }, [open]);

  const filteredBoats = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeFilteredBoats = boats.filter((boat) => {
      const normalizedType = boat.type?.trim().toLowerCase();
      if (boatTab === 'cargo') return normalizedType === 'cargo';
      return normalizedType === 'banca' || normalizedType === 'passenger';
    });
    if (!q) return typeFilteredBoats;
    return typeFilteredBoats.filter((boat) =>
      [boat.name, boat.type, boat.registrationNumber, formatDisplayBoatId(boat.id), ...(boat.routeNames ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [boatTab, boats, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Select Boat</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-300">Choose one vessel from Boat Management.</DialogDescription>
        </DialogHeader>
        <Tabs value={boatTab} onValueChange={(value) => setBoatTab(value as 'banca' | 'cargo')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="banca">Banca</TabsTrigger>
            <TabsTrigger value="cargo">Cargo</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search boat name, id, type, or route..."
            className="border-slate-200 bg-white pl-9 text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
          />
        </div>
        <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boat ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>{boatTab === 'cargo' ? 'Max Weight (kg)' : 'Capacity'}</TableHead>
                <TableHead>Routes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoats.map((boat) => (
                <TableRow
                  key={boat.id}
                  className="cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800"
                  onClick={() => onSelect(boat)}
                >
                  <TableCell className="font-semibold">{formatDisplayBoatId(boat.id)}</TableCell>
                  <TableCell>{boat.name}</TableCell>
                  <TableCell>{boatTab === 'cargo' ? `${boat.capacity ?? '-'} kg` : boat.capacity}</TableCell>
                  <TableCell>{boat.routeNames?.join(', ') || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredBoats.length === 0 && <EmptyStateRow colSpan={4} message="No matching boats found." />}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface OperatorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operators: { id: string; name: string }[];
  onSelect: (operator: { id: string; name: string }) => void;
  boatName?: string;
}

export const OperatorPickerDialog = ({ open, onOpenChange, operators, onSelect, boatName }: OperatorPickerDialogProps) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const filteredOperators = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter((operator) => operator.name.toLowerCase().includes(q));
  }, [operators, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Select Assigned Operator</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-300">
            {boatName ? `Operators assigned to ${boatName}` : 'Select boat first.'}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search operator name..."
            className="border-slate-200 bg-white pl-9 text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
          />
        </div>
        <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator ID</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperators.map((operator) => (
                <TableRow
                  key={operator.id}
                  className="cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800"
                  onClick={() => onSelect(operator)}
                >
                  <TableCell className="font-semibold">{operator.id}</TableCell>
                  <TableCell>{operator.name}</TableCell>
                </TableRow>
              ))}
              {filteredOperators.length === 0 && <EmptyStateRow colSpan={2} message="No matching operators found." />}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface RoutePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: Fare[];
  onSelect: (route: Fare) => void;
  boatName?: string;
}

export const RoutePickerDialog = ({ open, onOpenChange, routes, onSelect, boatName }: RoutePickerDialogProps) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((fare) => fare.route.toLowerCase().includes(q) || fare.fareName.toLowerCase().includes(q));
  }, [routes, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Select Route</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-300">
            {boatName ? `Routes assigned to ${boatName}` : 'Select boat first.'}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search route name..."
            className="border-slate-200 bg-white pl-9 text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
          />
        </div>
        <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Fare Name</TableHead>
                <TableHead className="text-center">Route</TableHead>
                <TableHead className="text-center">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((fare) => (
                <TableRow
                  key={fare.id}
                  className="cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800"
                  onClick={() => onSelect(fare)}
                >
                  <TableCell className="align-middle text-center font-semibold">{fare.fareName}</TableCell>
                  <TableCell className="align-middle text-center">{fare.route}</TableCell>
                  <TableCell className="align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatPrice(calculateTotalFare(fare))}</span>
                      {fare.type === 'commuter' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-sky-500">
                              <Info className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 text-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-900 dark:text-white">Fare Breakdown</p>
                              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                                <span>Base Fare:</span>
                                <span className="text-right">{formatPrice(fare.baseFare ?? 0)}</span>
                                <span>Distance:</span>
                                <span className="text-right">{fare.distanceKm} km</span>
                                <span>Excess:</span>
                                <span className="text-right">{Math.max((fare.distanceKm ?? 0) - 1, 0)} km</span>
                                <span>Rate:</span>
                                <span className="text-right">{fare.percentagePerKilometer}% / km</span>
                                <div className="col-span-2 mt-1 flex justify-between border-t border-slate-200 pt-1 font-medium text-slate-900 dark:border-white/10 dark:text-white">
                                  <span>Total:</span>
                                  <span>{formatPrice(calculateTotalFare(fare))}</span>
                                </div>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">* Base fare covers the first 1km.</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRoutes.length === 0 && <EmptyStateRow colSpan={3} message="No matching routes found." />}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
