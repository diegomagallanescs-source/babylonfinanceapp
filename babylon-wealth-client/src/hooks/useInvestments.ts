import { useQuery } from '@tanstack/react-query';
import { fetchInvestments } from '../api/ledger';

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
    staleTime: 30_000,
  });
}
