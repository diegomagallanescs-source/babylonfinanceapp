import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStatement } from '../api/statements';

export function useDeleteStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStatement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
    },
  });
}
