import { useQuery } from '@tanstack/react-query';
import { fetchSpendingTrend } from '../api/spending';
import { fetchIncomeSources, fetchInvestmentIncome } from '../api/income';
import type { TimePeriod } from '../types';
import { getDateRange } from '../utils/periods';

export interface MoneyFlowPoint {
  label: string;
  year: number;
  month: number;
  moneyIn: number;
  moneyOut: number;
}

export function useMoneyFlow(period: TimePeriod) {
  const { from, to } = getDateRange(period);

  const spendingQuery = useQuery({
    queryKey: ['spending', 'trend', period],
    queryFn: () => fetchSpendingTrend(from, to),
    staleTime: 60_000,
  });

  const incomeSourcesQuery = useQuery({
    queryKey: ['income', 'sources'],
    queryFn: fetchIncomeSources,
    staleTime: 5 * 60_000,
  });

  const investmentIncomeQuery = useQuery({
    queryKey: ['income', 'investment'],
    queryFn: fetchInvestmentIncome,
    staleTime: 60_000,
  });

  const isLoading =
    spendingQuery.isLoading || incomeSourcesQuery.isLoading || investmentIncomeQuery.isLoading;

  const data: MoneyFlowPoint[] = (() => {
    if (isLoading || !spendingQuery.data || !incomeSourcesQuery.data || !investmentIncomeQuery.data)
      return [];

    const activeMonthlyIncome = incomeSourcesQuery.data
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);

    // Determine which year/month buckets exist (union of spending + date range)
    const buckets = new Map<string, MoneyFlowPoint>();

    const addBucket = (year: number, month: number) => {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!buckets.has(key)) {
        const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
        buckets.set(key, { label, year, month, moneyIn: 0, moneyOut: 0 });
      }
      return key;
    };

    // Fill months from date range
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      addBucket(cursor.getFullYear(), cursor.getMonth() + 1);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Add regular income per month
    for (const [, pt] of buckets) pt.moneyIn += activeMonthlyIncome;

    // Add investment income received within period
    const fromMs = from.getTime();
    const toMs = to.getTime();
    for (const entry of investmentIncomeQuery.data) {
      const d = new Date(entry.receivedDate);
      if (d.getTime() < fromMs || d.getTime() > toMs) continue;
      const key = addBucket(d.getFullYear(), d.getMonth() + 1);
      buckets.get(key)!.moneyIn += entry.amount;
    }

    // Add spending per month
    for (const pt of spendingQuery.data) {
      const key = `${pt.year}-${String(pt.month).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.get(key)!.moneyOut += pt.total;
    }

    return Array.from(buckets.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
  })();

  return { data, isLoading, isError: spendingQuery.isError };
}
