// ── Bank ──────────────────────────────────────────────────────
export interface BankDto {
  id: string;
  name: string;
  logoUrl: string | null;
  type: string;
}

// ── Bank Account ─────────────────────────────────────────────
export interface BankAccountResponseDto {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  balance: number;
  accountType: string;
  budgetCategoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountRequest {
  bankId?: string | null;
  customLabel: string;
  balance: number;
  accountType: string;
  budgetCategoryId?: string | null;
}

export interface UpdateBankAccountRequest {
  bankId?: string | null;
  customLabel?: string;
  balance?: number;
  accountType?: string;
  budgetCategoryId?: string | null;
}

// ── Credit Card ──────────────────────────────────────────────
export interface CreditCardResponseDto {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  balance: number;
  creditLimit: number;
  apr: number;
  cardType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditCardRequest {
  bankId?: string | null;
  customLabel: string;
  balance: number;
  creditLimit: number;
  apr: number;
  cardType: string;
}

export interface UpdateCreditCardRequest {
  bankId?: string | null;
  customLabel?: string;
  balance?: number;
  creditLimit?: number;
  apr?: number;
  cardType?: string;
}

// ── Loan ─────────────────────────────────────────────────────
export interface LoanResponseDto {
  id: string;
  customLabel: string;
  lenderName: string;
  balance: number;
  interestRate: number;
  loanType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequest {
  customLabel: string;
  lenderName: string;
  balance: number;
  interestRate: number;
  loanType: string;
}

export interface UpdateLoanRequest {
  customLabel?: string;
  lenderName?: string;
  balance?: number;
  interestRate?: number;
  loanType?: string;
}

// ── Investment ───────────────────────────────────────────────
export interface InvestmentResponseDto {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  currentValue: number;
  ticker: string | null;
  investmentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestmentRequest {
  bankId?: string | null;
  customLabel: string;
  currentValue: number;
  ticker?: string | null;
  investmentType: string;
}

export interface UpdateInvestmentRequest {
  bankId?: string | null;
  customLabel?: string;
  currentValue?: number;
  ticker?: string | null;
  investmentType?: string;
}

// ── Pending Item ─────────────────────────────────────────────
export interface PendingItemResponseDto {
  id: string;
  description: string;
  counterparty: string | null;
  amount: number;
  dueDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePendingItemRequest {
  description: string;
  counterparty?: string | null;
  amount: number;
  dueDate?: string | null;
}

export interface UpdatePendingItemRequest {
  description?: string;
  counterparty?: string | null;
  amount?: number;
  dueDate?: string | null;
}

// ── Budget Category ──────────────────────────────────────────
export interface BudgetCategoryResponseDto {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  displayOrder: number;
  createdAt: string;
}

// ── Property ─────────────────────────────────────────────────
export interface PropertyResponseDto {
  id: string;
  address: string;
  purchasePrice: number;
  currentEstimatedValue: number;
  loanBalance: number;
  interestRate: number;
  loanType: string;
  monthlyRent: number;
  monthlyExpenses: number;
  equity: number;
  monthlyCashFlow: number;
  lastValueUpdateDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyRequest {
  address: string;
  purchasePrice: number;
  currentEstimatedValue: number;
  loanBalance: number;
  interestRate: number;
  loanType: string;
  monthlyRent: number;
  monthlyExpenses: number;
}

export interface UpdatePropertyRequest {
  address?: string;
  purchasePrice?: number;
  currentEstimatedValue?: number;
  loanBalance?: number;
  monthlyRent?: number;
  monthlyExpenses?: number;
}
