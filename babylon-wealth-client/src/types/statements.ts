// ── Shared ────────────────────────────────────────────────────

export interface SelectedPeriod {
  mode: 'monthly' | 'year-end';
  month: number | null; // 1–12; null for year-end
  year: number;
  label: string; // e.g. "January 2025" or "2025 Year-End"
}

// ── Checking (Money In) ───────────────────────────────────────

export interface CheckingTransactionDto {
  date: string;
  description: string;
  amount: number;
  direction: 'In' | 'Out';
  category: string;
  accountLast4?: string;
  sourceFile?: string;
}

export interface CheckingCategoryBreakdownDto {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface CheckingStatementResponseDto {
  statementPeriod: string;
  inferredMonth: number | null;
  inferredYear: number | null;
  accountsDetected: string[];
  totalMoneyIn: number;
  totalMoneyOut: number;
  netFlow: number;
  transactionCount: number;
  transactions: CheckingTransactionDto[];
  moneyInBreakdown: CheckingCategoryBreakdownDto[];
  moneyOutBreakdown: CheckingCategoryBreakdownDto[];
  parseWarnings: string[];
}

export interface SaveCheckingStatementRequest {
  month: number;
  year: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  transactionCount: number;
  accountsIncluded: string;
  notes?: string;
}

export interface CheckingStatementSummaryDto {
  id: string;
  month: number;
  year: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  netFlow: number;
  transactionCount: number;
  accountsIncluded: string;
  notes: string | null;
  createdAt: string;
}

// ── Credit Card (Money Out) ───────────────────────────────────

export interface ParsedTransactionDto {
  date: string;
  description: string;
  amount: number;
  category: string;
  accountLast4?: string;
}

export interface CategoryBreakdownDto {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TopMerchantDto {
  name: string;
  total: number;
  count: number;
}

export interface MonthlySpendDto {
  month: number;
  monthName: string;
  total: number;
  count: number;
}

export interface StatementAnalysisResponseDto {
  statementPeriod: string;
  reportType: 'Monthly' | 'YearEnd';
  inferredMonth: number | null;
  inferredYear: number | null;
  accountsDetected: string[];
  totalPurchases: number;
  transactionCount: number;
  hasTransactions: boolean;
  transactions: ParsedTransactionDto[];
  categoryBreakdown: CategoryBreakdownDto[];
  topMerchants: TopMerchantDto[];
  monthlyBreakdown: MonthlySpendDto[];
  parseWarnings: string[];
}

export interface SaveStatementRequest {
  month: number;
  year: number;
  totalSpend: number;
  transactionCount: number;
  accountsIncluded: string;
  notes?: string;
}

export interface StatementSummaryResponseDto {
  id: string;
  month: number;
  year: number;
  totalSpend: number;
  transactionCount: number;
  accountsIncluded: string;
  notes: string | null;
  createdAt: string;
}
