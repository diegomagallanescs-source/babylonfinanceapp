import { useQuery } from '@tanstack/react-query';
import { fetchStatementAnnualSummary } from '../api/statements';

export function useStatementAnnualSummary() {
  return useQuery({
    queryKey: ['statement-annual-summary'],
    queryFn: fetchStatementAnnualSummary,
    staleTime: 60_000,
  });
}
