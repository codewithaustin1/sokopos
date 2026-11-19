import { DateRange, TimeRangePreset } from '../types/reporting';

/**
 * Parses a Date or YYYY-MM-DD / ISO string cleanly in local time.
 * Plain YYYY-MM-DD strings are parsed as local calendar dates to prevent UTC off-by-one day shifts.
 */
export function parseDateInput(value?: Date | string): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const localDate = new Date(year, month, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculates start and end timestamps according to the requested preset.
 * All ranges except 'last_24h' are strictly calendar-based.
 */
export function calculateDateRange(
  preset: TimeRangePreset,
  customStart?: Date | string,
  customEnd?: Date | string
): DateRange {
  const now = new Date();

  // Helper to get calendar start of day (00:00:00.000)
  const startOfDay = (d: Date) => {
    const res = new Date(d);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  // Helper to get calendar end of day (23:59:59.999)
  const endOfDay = (d: Date) => {
    const res = new Date(d);
    res.setHours(23, 59, 59, 999);
    return res;
  };

  switch (preset) {
    case 'today': {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return {
        start,
        end,
        label: 'Today (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'last_24h': {
      const end = new Date(now);
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return {
        start,
        end,
        label: 'Last 24 Hours (Rolling)',
        preset,
        isRolling: true,
      };
    }

    case 'last_7d': {
      const end = endOfDay(now);
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      const start = startOfDay(past);
      return {
        start,
        end,
        label: 'Last 7 Days (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'last_30d': {
      const end = endOfDay(now);
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      const start = startOfDay(past);
      return {
        start,
        end,
        label: 'Last 30 Days (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'last_90d': {
      const end = endOfDay(now);
      const past = new Date(now);
      past.setDate(past.getDate() - 89);
      const start = startOfDay(past);
      return {
        start,
        end,
        label: 'Last 90 Days (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'last_180d': {
      const end = endOfDay(now);
      const past = new Date(now);
      past.setDate(past.getDate() - 179);
      const start = startOfDay(past);
      return {
        start,
        end,
        label: 'Last 180 Days (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'last_1y': {
      const end = endOfDay(now);
      const past = new Date(now);
      past.setFullYear(past.getFullYear() - 1);
      const start = startOfDay(past);
      return {
        start,
        end,
        label: 'Last 1 Year (Calendar)',
        preset,
        isRolling: false,
      };
    }

    case 'custom': {
      const parsedStart = parseDateInput(customStart);
      const parsedEnd = parseDateInput(customEnd);
      let start = parsedStart ? startOfDay(parsedStart) : startOfDay(now);
      let end = parsedEnd ? endOfDay(parsedEnd) : endOfDay(now);
      if (start.getTime() > end.getTime()) {
        const swappedStart = startOfDay(end);
        const swappedEnd = endOfDay(start);
        start = swappedStart;
        end = swappedEnd;
      }
      const sameDay = toInputDateFormat(start) === toInputDateFormat(end);
      const fmtOpts: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      const label = sameDay
        ? start.toLocaleDateString(undefined, fmtOpts)
        : `${start.toLocaleDateString(undefined, fmtOpts)} – ${end.toLocaleDateString(undefined, fmtOpts)}`;
      return {
        start,
        end,
        label,
        preset,
        isRolling: false,
      };
    }

    case 'all':
    default: {
      const start = new Date(2020, 0, 1);
      const end = endOfDay(now);
      return {
        start,
        end,
        label: 'All Time',
        preset: 'all',
        isRolling: false,
      };
    }
  }
}

/**
 * Calculates the previous equivalent period for period-over-period comparison.
 */
export function getPreviousEquivalentRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  const prevEnd = new Date(range.start.getTime() - 1); // 1 ms before current start
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    start: prevStart,
    end: prevEnd,
    label: `Prior Equivalent Period`,
    preset: range.preset,
    isRolling: range.isRolling,
  };
}

/**
 * Checks if a given timestamp falls within the date range.
 */
export function isTimestampInRange(timestamp: string | Date | number, range: DateRange): boolean {
  const date = new Date(timestamp);
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

/**
 * Formats a Date into YYYY-MM-DD for HTML date inputs.
 */
export function toInputDateFormat(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the inclusive calendar day count spanned by a DateRange.
 */
export function getInclusiveDayCount(range: DateRange): number {
  const startDay = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const endDay = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diffDays + 1);
}

/**
 * Formats a compact calendar span for headers and filter chips.
 */
export function formatShortDateRange(range: DateRange): string {
  if (range.preset === 'all') return 'Since Jan 2020';
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  const sameDay = toInputDateFormat(range.start) === toInputDateFormat(range.end);

  if (sameDay) {
    return range.start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const startStr = range.start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endStr = range.end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

/**
 * Formats date range for human-readable display on reports and print headers.
 */
export function formatRangeDisplay(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (range.preset === 'today') {
    return `${range.start.toLocaleDateString(undefined, options)} (00:00 - 23:59)`;
  }
  if (range.preset === 'last_24h') {
    return `${range.start.toLocaleString()} - ${range.end.toLocaleString()}`;
  }

  return `${range.start.toLocaleDateString(undefined, options)} to ${range.end.toLocaleDateString(undefined, options)}`;
}
