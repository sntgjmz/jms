import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BirthDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  minAge?: number;
  hasError?: boolean;
  errorMessage?: string;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const BirthDatePicker = ({ value, onChange, disabled, minAge = 18, hasError, errorMessage }: BirthDatePickerProps) => {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => (currentYear - minAge - i).toString()), [currentYear, minAge]);
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const [year, month, day] = useMemo(() => {
    if (!value) return ['', '', ''];
    const [y, m, d] = value.split('-');
    return [y, m, d];
  }, [value]);

  const handleDateChange = (field: 'year' | 'month' | 'day', newValue: string) => {
    let y = year || years[0];
    let m = month || '01';
    let d = day || '01';

    if (field === 'year') y = newValue;
    if (field === 'month') m = newValue;
    if (field === 'day') d = newValue;

    const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
    if (parseInt(d) > daysInMonth) {
      d = daysInMonth.toString().padStart(2, '0');
    }

    onChange(`${y}-${m}-${d}`);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={month} onValueChange={(v) => handleDateChange('month', v)} disabled={disabled}>
        <SelectTrigger title={errorMessage} className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", hasError && "border-red-500 focus:ring-red-500")}><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent className="max-h-[200px]">{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={day} onValueChange={(v) => handleDateChange('day', v)} disabled={disabled}>
        <SelectTrigger title={errorMessage} className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", hasError && "border-red-500 focus:ring-red-500")}><SelectValue placeholder="Day" /></SelectTrigger>
        <SelectContent className="max-h-[200px]">{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year} onValueChange={(v) => handleDateChange('year', v)} disabled={disabled}>
        <SelectTrigger title={errorMessage} className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", hasError && "border-red-500 focus:ring-red-500")}><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent className="max-h-[200px]">{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
};