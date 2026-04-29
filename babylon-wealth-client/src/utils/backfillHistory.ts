import type { NetWorthHistoryPointDto, TimePeriod } from '../types';

/**
 * For each fixed-day period, the chart should always show exactly N points
 * (one per day), backfilled with the most recent known value when no
 * snapshot exists for that day.
 *
 *  1W = 7 daily points (today and the prior 6 days)
 *  1M = 30
 *  3M = 90
 *  6M = 180
 *  1Y = 365
 *
 * YTD spans Jan 1 of the current year through today.
 * ALL returns the actual snapshots untouched (oldest → newest).
 */

const PERIOD_DAYS: Partial<Record<TimePeriod, number>> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

function ymd(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function backfillHistory(
  data: NetWorthHistoryPointDto[],
  period: TimePeriod
): NetWorthHistoryPointDto[] {
  if (data.length === 0) return [];

  // Sort ascending (oldest → newest)
  const sorted = [...data].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );

  // ALL: just hand back the real snapshots
  if (period === 'ALL') return sorted;

  const today = startOfDay(new Date());
  let start: Date;

  if (period === 'YTD') {
    start = startOfDay(new Date(today.getFullYear(), 0, 1));
  } else {
    const days = PERIOD_DAYS[period];
    if (!days) return sorted;
    start = startOfDay(today);
    start.setDate(start.getDate() - (days - 1));
  }

  return fillDailyRange(sorted, start, today);
}

function fillDailyRange(
  sortedAsc: NetWorthHistoryPointDto[],
  start: Date,
  end: Date
): NetWorthHistoryPointDto[] {
  const oldest = sortedAsc[0];

  // Index real snapshots by date for annotation lookup
  const byDay = new Map<string, NetWorthHistoryPointDto>();
  for (const p of sortedAsc) {
    byDay.set(ymd(new Date(p.snapshotDate)), p);
  }

  const result: NetWorthHistoryPointDto[] = [];
  let pointerIdx = 0;
  let current   = oldest;

  for (let cur = new Date(start); cur.getTime() <= end.getTime(); cur.setDate(cur.getDate() + 1)) {
    // Advance pointer through every snapshot whose date is ≤ cur
    while (
      pointerIdx < sortedAsc.length &&
      startOfDay(new Date(sortedAsc[pointerIdx].snapshotDate)).getTime() <= cur.getTime()
    ) {
      current = sortedAsc[pointerIdx];
      pointerIdx++;
    }

    const isoDate = new Date(cur).toISOString();
    const realPoint = byDay.get(ymd(cur));

    result.push({
      snapshotDate:  isoDate,
      liquidNetWorth: current.liquidNetWorth,
      totalNetWorth:  current.totalNetWorth,
      annotation:     realPoint?.annotation ?? null,
    });
  }

  return result;
}
