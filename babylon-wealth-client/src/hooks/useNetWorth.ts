import { useQuery } from '@tanstack/react-query';
import { fetchNetWorthCurrent, fetchNetWorthHistory } from '../api/networth';
import type { TimePeriod } from '../types';
import { getDateRange } from '../utils/periods';

export function useNetWorth() {
  return useQuery({
    queryKey: ['networth', 'current'],
    queryFn: fetchNetWorthCurrent,
    staleTime: 30_000,
  });
}

export function useNetWorthHistory(period: TimePeriod) {
  const { from, to } = getDateRange(period);
  return useQuery({
    queryKey: ['networth', 'history', period],
    queryFn: () => fetchNetWorthHistory(from, to),
    staleTime: 60_000,
  });
}
