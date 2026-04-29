import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProperty } from '../api/ledger';

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
