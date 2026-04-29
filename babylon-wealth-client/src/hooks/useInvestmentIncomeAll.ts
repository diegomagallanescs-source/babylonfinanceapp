import { useQuery } from '@tanstack/react-query';
import { fetchInvestmentIncome } from '../api/income';

export function useInvestmentIncomeAll() {
  return useQuery({
    queryKey: ['investmentIncome', 'all'],
    queryFn: fetchInvestmentIncome,
    staleTime: 60_000,
  });
}
