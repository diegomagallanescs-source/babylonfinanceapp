import { useQuery } from '@tanstack/react-query';
import { fetchPurchasesByMonth } from '../api/purchases';

export function usePurchases(month: number, year: number) {
  return useQuery({
    queryKey: ['purchases', 'month', year, month],
    queryFn: () => fetchPurchasesByMonth(month, year),
  });
}
