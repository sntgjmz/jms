import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AvailabilityCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  countLabel: string;
  selectedDate: string;
  availabilityMap: Record<string, number>;
  onSelectDate: (date: string) => void;
  onVisibleRangeChange?: (range: { from: string; to: string }) => void;
}

const addMonths = (base: Date, months: number) => new Date(base.getFullYear(), base.getMonth() + months, 1);
const toIsoDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);
const todayIsoDate = () => toIsoDate(new Date());
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfCalendarGrid = (date: Date) => {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), firstOfMonth.getDate() - firstOfMonth.getDay());
};
const sameMonth = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const sameYearMonth = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getAvailabilityTone = (count: number) => {
  if (count <= 0) {
    return {
      chip: 'text-slate-400',
      dot: 'bg-slate-500/40',
      cell: '',
    };
  }
  if (count <= 2) {
    return {
      chip: 'text-amber-600 dark:text-amber-300',
      dot: 'bg-amber-400',
      cell: 'bg-amber-500/5',
    };
  }
  if (count <= 5) {
    return {
      chip: 'text-emerald-600 dark:text-emerald-300',
      dot: 'bg-emerald-400',
      cell: 'bg-emerald-500/5',
    };
  }
  return {
    chip: 'text-sky-600 dark:text-sky-300',
    dot: 'bg-sky-400',
    cell: 'bg-sky-500/5',
  };
};

const AvailabilityCalendarDialog = ({
  open,
  onOpenChange,
  title,
  description,
  countLabel,
  selectedDate,
  availabilityMap,
  onSelectDate,
  onVisibleRangeChange,
}: AvailabilityCalendarDialogProps) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => todayIsoDate(), []);
  const currentMonth = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset]);
  const months = useMemo(() => [currentMonth, addMonths(currentMonth, 1)], [currentMonth]);

  useEffect(() => {
    if (open) {
      setMonthOffset(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !onVisibleRangeChange) {
      return;
    }
    onVisibleRangeChange({
      from: toIsoDate(currentMonth),
      to: toIsoDate(endOfMonth(months[months.length - 1])),
    });
  }, [currentMonth, months, onVisibleRangeChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="icon" onClick={() => setMonthOffset((prev) => prev - 1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a date to filter by daily availability.
          </p>
          <Button type="button" variant="outline" size="icon" onClick={() => setMonthOffset((prev) => prev + 1)}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500/40" />
            No data
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Low
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Medium
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            High
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {months.map((monthDate) => {
            const gridStart = startOfCalendarGrid(monthDate);
            const isCurrentMonth = sameYearMonth(monthDate, today);
            const days = Array.from({ length: 42 }, (_, index) => {
              const value = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
              const iso = toIsoDate(value);
              const count = availabilityMap[iso] ?? 0;
              return { value, iso, count, inMonth: sameMonth(value, monthDate) };
            });

            return (
              <div
                key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                className={[
                  'rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60',
                  isCurrentMonth && 'border-sky-300 bg-sky-50/60 shadow-[0_0_0_1px_rgba(56,189,248,0.18)] dark:border-sky-500/40 dark:bg-sky-500/10',
                ].join(' ')}
              >
                <div className="mb-4 flex items-center justify-center gap-2 text-center">
                  <p className={`text-xl font-semibold ${isCurrentMonth ? 'text-sky-700 dark:text-sky-300' : 'text-slate-900 dark:text-white'}`}>
                    {new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(monthDate)}
                  </p>
                  {isCurrentMonth && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {weekdayLabels.map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const active = day.iso === selectedDate;
                    const isToday = day.iso === todayKey;
                    const tone = getAvailabilityTone(day.count);
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => {
                          onSelectDate(day.iso);
                          onOpenChange(false);
                        }}
                        className={[
                          'min-h-[60px] rounded-2xl border px-2 py-2 text-left transition',
                          active
                            ? 'border-sky-500 bg-sky-500/15 shadow-[0_0_0_1px_rgba(14,165,233,0.45),0_12px_24px_rgba(14,165,233,0.14)]'
                            : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-sky-500/40 dark:hover:bg-slate-900',
                          isToday && !active && 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10',
                          tone.cell,
                          !day.inMonth && 'opacity-35',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`block text-sm font-semibold ${active ? 'text-sky-700 dark:text-sky-200' : isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                            {day.value.getDate()}
                          </span>
                          <span className={`mt-1 h-2 w-2 rounded-full ${active ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.18)]' : isToday ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.18)]' : tone.dot}`} />
                        </div>
                        <span className={`mt-1 block truncate text-[10px] font-medium ${tone.chip}`}>
                          {isToday
                            ? day.count > 0
                              ? `Today - ${day.count}`
                              : 'Today'
                            : day.count > 0
                              ? `${day.count} ${countLabel}`
                              : 'No data'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvailabilityCalendarDialog;
