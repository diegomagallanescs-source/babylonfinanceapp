import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProperty } from '../api/ledger';

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
