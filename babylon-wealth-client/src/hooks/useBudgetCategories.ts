import { useQuery } from '@tanstack/react-query';
import { fetchBudgetCategories } from '../api/budgetCategories';

export function useBudgetCategories() {
  return useQuery({
    queryKey: ['budgetCategories'],
    queryFn: fetchBudgetCategories,
    staleTime: Infinity,
  });
}
