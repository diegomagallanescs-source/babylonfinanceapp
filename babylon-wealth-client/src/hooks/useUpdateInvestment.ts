import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateInvestment } from '../api/ledger';
import type { UpdateInvestmentRequest } from '../types';

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInvestmentRequest }) =>
      updateInvestment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['networth'] });
    },
  });
}
