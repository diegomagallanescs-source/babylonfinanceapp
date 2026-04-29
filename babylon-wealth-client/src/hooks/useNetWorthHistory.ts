import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNetWorthHistory } from '../api/networth';
import { backfillHistory } from '../utils/backfillHistory';
import type { TimePeriod } from '../types';

/**
 * Always fetches the full history once (cached), then applies daily
 * backfill on the client based on the selected period.  Each period
 * change is therefore instantaneous — no extra API calls.
 */
export function useNetWorthHistory(period: TimePeriod) {
  const allTimeStart = new Date(2020, 0, 1);
  const today        = new Date();

  const query = useQuery({
    queryKey: ['networth', 'history', 'all'],
    queryFn:  () => fetchNetWorthHistory(allTimeStart, today),
    staleTime: 60_000,
  });

  const data = useMemo(
    () => backfillHistory(query.data ?? [], period),
    [query.data, period]
  );

  return { ...query, data };
}
