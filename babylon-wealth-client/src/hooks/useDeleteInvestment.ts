import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteInvestment } from '../api/ledger';

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvestment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['networth'] });
    },
  });
}
