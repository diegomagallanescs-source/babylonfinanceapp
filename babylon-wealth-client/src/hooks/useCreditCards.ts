import { useQuery } from '@tanstack/react-query';
import { fetchCreditCards } from '../api/ledger';

export function useCreditCards() {
  return useQuery({
    queryKey: ['creditcards'],
    queryFn: fetchCreditCards,
    staleTime: 30_000,
  });
}
