import { useQuery } from '@tanstack/react-query';
import { fetchSpendingCategories } from '../api/spendingCategories';

export function useSpendingCategories() {
  return useQuery({
    queryKey: ['spending-categories'],
    queryFn: fetchSpendingCategories,
    staleTime: 5 * 60_000,
  });
}
