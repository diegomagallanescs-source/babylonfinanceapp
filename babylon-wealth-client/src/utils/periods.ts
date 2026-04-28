import type { TimePeriod } from '../types';

export function getDateRange(period: TimePeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case '1W': from.setDate(from.getDate() - 7); break;
    case '1M': from.setMonth(from.getMonth() - 1); break;
    case '3M': from.setMonth(from.getMonth() - 3); break;
    case 'YTD': from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    case '1Y': from.setFullYear(from.getFullYear() - 1); break;
    case 'ALL': from.setFullYear(2020, 0, 1); break;
  }

  return { from, to };
}

export const ALL_PERIODS: TimePeriod[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
