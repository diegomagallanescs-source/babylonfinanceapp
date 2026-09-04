import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPurchase } from '../api/purchases';
import type { CreatePurchaseRequest } from '../types/spending';

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePurchaseRequest) => createPurchase(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}
