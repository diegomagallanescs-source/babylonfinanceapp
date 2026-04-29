export type { NetWorthResponseDto, NetWorthHistoryPointDto, AnnualSummaryDto } from './netWorth';
export type {
  BankDto,
  BudgetCategoryResponseDto,
  BankAccountResponseDto, CreateBankAccountRequest, UpdateBankAccountRequest,
  CreditCardResponseDto, CreateCreditCardRequest, UpdateCreditCardRequest,
  LoanResponseDto, CreateLoanRequest, UpdateLoanRequest,
  InvestmentResponseDto, CreateInvestmentRequest, UpdateInvestmentRequest,
  PendingItemResponseDto, CreatePendingItemRequest, UpdatePendingItemRequest,
  PropertyResponseDto, CreatePropertyRequest, UpdatePropertyRequest,
} from './ledger';

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

export interface CreateInvestmentIncomeRequest {
  sourceName: string;
  type: string;
  amount: number;
  receivedDate: string;
  notes?: string;
}

// Matches GET /investmentincome/summary
export interface PassiveIncomeTrendPoint {
  year: number;
  month: number;
  total: number;
  label: string; // e.g. "Apr 2026"
}

export interface PassiveIncomeSummaryDto {
  currentMonthTotal: number;
  currentYearTotal: number;
  passiveToExpensesRatio: number | null; // null if no spending data
  twelveMonthTrend: PassiveIncomeTrendPoint[];
}

// Matches UserProfileResponseDto from GET /users/me
export interface UserDto {
  id: string;
  email: string;
  firstName: string | null;
  createdAt: string;
}

// Matches AuthResponseDto from POST /auth/login and POST /auth/register
export interface AuthResponseDto {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  firstName: string | null;
}

export type TimePeriod = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';
