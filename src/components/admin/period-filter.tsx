'use client';

import { useState, useCallback } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subWeeks,
  subMonths,
  subQuarters,
  subDays,
  differenceInDays,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import type { DateRange } from 'react-day-picker';

export type PeriodRange = { start: string; end: string };

interface PeriodFilterProps {
  onChange: (current: PeriodRange, previous: PeriodRange, label: string) => void;
}

type PresetKey = 'current_week' | 'previous_week' | 'current_month' | 'previous_month' | 'current_quarter' | 'previous_quarter' | 'custom';

const PRESET_LABELS: Record<PresetKey, string> = {
  current_week: 'Semana actual',
  previous_week: 'Semana anterior',
  current_month: 'Mes actual',
  previous_month: 'Mes anterior',
  current_quarter: 'Trimestre actual',
  previous_quarter: 'Trimestre anterior',
  custom: 'Rango personalizado',
};

function computeRanges(preset: PresetKey, customRange?: DateRange): { current: PeriodRange; previous: PeriodRange } {
  const now = new Date();

  const toISO = (d: Date) => d.toISOString();

  switch (preset) {
    case 'current_week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = now;
      const prevStart = subWeeks(start, 1);
      const prevEnd = endOfWeek(prevStart, { weekStartsOn: 1 });
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'previous_week': {
      const start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      const prevStart = subWeeks(start, 1);
      const prevEnd = endOfWeek(prevStart, { weekStartsOn: 1 });
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'current_month': {
      const start = startOfMonth(now);
      const end = now;
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'previous_month': {
      const start = startOfMonth(subMonths(now, 1));
      const end = endOfMonth(subMonths(now, 1));
      const prevStart = startOfMonth(subMonths(now, 2));
      const prevEnd = endOfMonth(subMonths(now, 2));
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'current_quarter': {
      const start = startOfQuarter(now);
      const end = now;
      const prevStart = startOfQuarter(subQuarters(now, 1));
      const prevEnd = endOfQuarter(subQuarters(now, 1));
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'previous_quarter': {
      const start = startOfQuarter(subQuarters(now, 1));
      const end = endOfQuarter(subQuarters(now, 1));
      const prevStart = startOfQuarter(subQuarters(now, 2));
      const prevEnd = endOfQuarter(subQuarters(now, 2));
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
    case 'custom': {
      if (!customRange?.from || !customRange?.to) {
        // Fallback to current month
        return computeRanges('current_month');
      }
      const start = customRange.from;
      const end = customRange.to;
      const days = differenceInDays(end, start);
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, days);
      return {
        current: { start: toISO(start), end: toISO(end) },
        previous: { start: toISO(prevStart), end: toISO(prevEnd) },
      };
    }
  }
}

export function PeriodFilter({ onChange }: PeriodFilterProps) {
  const [preset, setPreset] = useState<PresetKey>('current_month');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = useCallback((value: string) => {
    const key = value as PresetKey;
    setPreset(key);
    if (key !== 'custom') {
      const { current, previous } = computeRanges(key);
      onChange(current, previous, PRESET_LABELS[key]);
    }
  }, [onChange]);

  const handleCustomRangeSelect = useCallback((range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      const { current, previous } = computeRanges('custom', range);
      const label = `${format(range.from, 'dd MMM', { locale: es })} - ${format(range.to, 'dd MMM yyyy', { locale: es })}`;
      onChange(current, previous, label);
      setCalendarOpen(false);
    }
  }, [onChange]);

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
            <SelectItem key={key} value={key}>
              {PRESET_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {customRange?.from && customRange?.to
                ? `${format(customRange.from, 'dd/MM/yy')} - ${format(customRange.to, 'dd/MM/yy')}`
                : 'Seleccionar fechas'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Export for initial load without waiting for onChange
export function getDefaultPeriodRanges(): { current: PeriodRange; previous: PeriodRange; label: string } {
  const { current, previous } = computeRanges('current_month');
  return { current, previous, label: PRESET_LABELS.current_month };
}
