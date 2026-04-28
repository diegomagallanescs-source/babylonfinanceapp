export interface NetWorthResponseDto {
  liquidNetWorth: number;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalCreditUsed: number;
  totalCreditLimit: number;
  creditUtilizationPercent: number | null;
  pendingItemsNet: number;
  propertyEquity: number;
  hasProperties: boolean;
  computedAt: string;
}

export interface NetWorthHistoryPointDto {
  snapshotDate: string;
  liquidNetWorth: number;
  totalNetWorth: number;
  annotation: string | null;
}

export interface AnnualSummaryDto {
  year: number;
  totalIncome: number;
  totalSpending: number;
  netSavings: number;
  savingsRate: number;
}
