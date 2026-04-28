import { useQuery } from '@tanstack/react-query';
import { fetchAccounts } from '../api/ledger';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 30_000,
  });
}
