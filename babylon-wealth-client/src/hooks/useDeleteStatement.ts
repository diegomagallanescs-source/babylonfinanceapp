import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStatementYear } from '../api/statements';

export function useDeleteStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => deleteStatementYear(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
    },
  });
}
