import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateChecking } from '../api/statements';
import type { SaveCheckingStatementRequest } from '../types/statements';

export function useUpdateChecking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & SaveCheckingStatementRequest) =>
      updateChecking(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checking-history'] });
    },
  });
}
