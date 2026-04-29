import { useQuery } from '@tanstack/react-query';
import { fetchCheckingHistory } from '../api/statements';

export function useCheckingHistory() {
  return useQuery({
    queryKey: ['checking-history'],
    queryFn: fetchCheckingHistory,
    staleTime: 30_000,
  });
}
