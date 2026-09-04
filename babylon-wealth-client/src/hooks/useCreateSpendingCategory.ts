import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSpendingCategory } from '../api/spendingCategories';
import type { CreateSpendingCategoryRequest } from '../types/spending';

export function useCreateSpendingCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateSpendingCategoryRequest) => createSpendingCategory(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending-categories'] });
    },
  });
}
