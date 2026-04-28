import { useQuery } from '@tanstack/react-query';
import { fetchNetWorthCurrent } from '../api/networth';

export function useNetWorth() {
  return useQuery({
    queryKey: ['networth', 'current'],
    queryFn: fetchNetWorthCurrent,
    staleTime: 30_000,
  });
}
