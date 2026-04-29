import { useQuery } from '@tanstack/react-query';
import { fetchPassiveIncomeSummary } from '../api/income';

export function usePassiveIncome() {
  return useQuery({
    queryKey: ['passiveIncome'],
    queryFn: fetchPassiveIncomeSummary,
    staleTime: 60_000,
  });
}
