import { useQuery } from '@tanstack/react-query';
import { fetchPendingItems } from '../api/ledger';

export function usePendingItems() {
  return useQuery({
    queryKey: ['pending'],
    queryFn: fetchPendingItems,
    staleTime: 30_000,
  });
}
