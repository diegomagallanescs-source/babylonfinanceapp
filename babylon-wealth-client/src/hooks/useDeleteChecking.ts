import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCheckingYear } from '../api/statements';

export function useDeleteChecking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => deleteCheckingYear(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checking-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
    },
  });
}
