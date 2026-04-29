import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvestmentIncome } from '../api/income';

export function useCreateInvestmentIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvestmentIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passiveIncome'] });
    },
  });
}
