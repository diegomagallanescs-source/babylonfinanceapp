import { useQuery } from '@tanstack/react-query';
import { fetchNetWorthHistory } from '../api/networth';
import type { TimePeriod } from '../types';
import { getDateRange } from '../utils/periods';

export function useNetWorthHistory(period: TimePeriod) {
  const { from, to } = getDateRange(period);
  return useQuery({
    queryKey: ['networth', 'history', period],
    queryFn: () => fetchNetWorthHistory(from, to),
    staleTime: 60_000,
  });
}
