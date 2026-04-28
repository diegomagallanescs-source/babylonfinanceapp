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

export interface SpendingTrendPointDto {
  year: number;
  month: number;
  total: number;
  label: string;
}

export interface IncomeResponseDto {
  id: string;
  name: string;
  type: string;
  annualAmount: number;
  monthlyAmount: number;
  arkadSavingsTarget: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentIncomeResponseDto {
  id: string;
  sourceName: string;
  type: string;
  typeLabel: string;
  amount: number;
  receivedDate: string;
  notes: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
}

export type TimePeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
