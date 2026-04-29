import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveChecking } from '../api/statements';
import type { SaveCheckingStatementRequest } from '../types/statements';

export function useSaveChecking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveCheckingStatementRequest) => saveChecking(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checking-history'] });
    },
  });
}
