import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStatement } from '../api/statements';
import type { SaveStatementRequest } from '../types/statements';

export function useUpdateStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & SaveStatementRequest) =>
      updateStatement(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-history'] });
    },
  });
}
