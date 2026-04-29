import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveStatement } from '../api/statements';
import type { SaveStatementRequest } from '../types/statements';

export function useSaveStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveStatementRequest) => saveStatement(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-history'] });
    },
  });
}
