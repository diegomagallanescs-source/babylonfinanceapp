import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvestment } from '../api/ledger';

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvestment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['networth'] });
    },
  });
}
