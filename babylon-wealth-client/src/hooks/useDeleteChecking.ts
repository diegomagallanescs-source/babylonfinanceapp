import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteChecking } from '../api/statements';

export function useDeleteChecking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChecking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checking-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
    },
  });
}
