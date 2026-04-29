import { useQuery } from '@tanstack/react-query';
import { fetchStatementHistory } from '../api/statements';

export function useStatementHistory() {
  return useQuery({
    queryKey: ['statement-history'],
    queryFn: fetchStatementHistory,
    staleTime: 30_000,
  });
}
