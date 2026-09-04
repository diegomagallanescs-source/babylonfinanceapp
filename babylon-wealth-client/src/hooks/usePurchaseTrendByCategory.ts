import { useQuery } from '@tanstack/react-query';
import { fetchPurchaseTrendByCategory } from '../api/purchases';

export function usePurchaseTrendByCategory(from: Date, to: Date) {
  return useQuery({
    queryKey: ['purchases', 'trend', 'by-category', from.toISOString(), to.toISOString()],
    queryFn: () => fetchPurchaseTrendByCategory(from, to),
    staleTime: 60_000,
  });
}
