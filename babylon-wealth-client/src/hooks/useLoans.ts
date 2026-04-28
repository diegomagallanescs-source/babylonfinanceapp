import { useQuery } from '@tanstack/react-query';
import { fetchLoans } from '../api/ledger';

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: fetchLoans,
    staleTime: 30_000,
  });
}
