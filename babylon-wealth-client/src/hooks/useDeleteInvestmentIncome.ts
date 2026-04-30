import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteInvestmentIncome } from '../api/income';

export function useDeleteInvestmentIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvestmentIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investmentIncome', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['passiveIncome'] });
    },
  });
}
