import { useQuery } from '@tanstack/react-query';
import { fetchSpendingTrend } from '../api/spending';
import { fetchIncomeSources } from '../api/income';
import type { AnnualSummaryDto } from '../types';

export function useAnnualSummary(year: number) {
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31, 23, 59, 59);

  return useQuery<AnnualSummaryDto>({
    queryKey: ['annual-summary', year],
    queryFn: async () => {
      const [trendPoints, incomeSources] = await Promise.all([
        fetchSpendingTrend(from, to),
        fetchIncomeSources(),
      ]);

      const totalSpending = trendPoints.reduce((sum, p) => sum + p.total, 0);
      const totalIncome = incomeSources
        .filter((s) => s.isActive)
        .reduce((sum, s) => sum + s.annualAmount, 0);
      const netSavings = totalIncome - totalSpending;
      const savingsRate = totalIncome > 0 ? netSavings / totalIncome : 0;

      return { year, totalIncome, totalSpending, netSavings, savingsRate };
    },
    staleTime: 60_000,
  });
}
