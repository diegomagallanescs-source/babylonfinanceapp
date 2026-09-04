import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePurchaseMonth } from '../api/purchases';

export function useDeletePurchaseMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => deletePurchaseMonth(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}
