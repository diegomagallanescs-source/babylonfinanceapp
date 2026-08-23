import type {
  BankAccountResponseDto,
  CreditCardResponseDto,
  InvestmentResponseDto,
  LoanResponseDto,
  PendingItemResponseDto,
  PropertyResponseDto,
} from '../types/ledger';
import type { ProjectionState } from '../types/projections';

/** Snapshot dates are date-only; read as local midnight so labels match the date picker. */
export function formatSnapshotDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Ids for projection rows are generated here — they never collide with real account ids. */
export function newRowId(): string {
  return crypto.randomUUID();
}

/**
 * Snapshots the live Accounting tab into a projection's starting ledger. Called once, when a
 * projection is created, so its first view matches what the user already sees. From then on the
 * projection's copy diverges freely and the real accounts are never read again.
 */
export function buildSeedState(input: {
  accounts?: BankAccountResponseDto[];
  investments?: InvestmentResponseDto[];
  creditCards?: CreditCardResponseDto[];
  loans?: LoanResponseDto[];
  pendingItems?: PendingItemResponseDto[];
  properties?: PropertyResponseDto[];
}): ProjectionState {
  return {
    accounts: (input.accounts ?? []).map((a) => ({
      id: newRowId(),
      bankId: a.bankId,
      bankName: a.bankName,
      bankLogoUrl: a.bankLogoUrl,
      customLabel: a.customLabel,
      balance: a.balance,
      accountType: a.accountType,
      budgetCategoryId: a.budgetCategoryId,
    })),
    investments: (input.investments ?? []).map((i) => ({
      id: newRowId(),
      bankId: i.bankId,
      bankName: i.bankName,
      bankLogoUrl: i.bankLogoUrl,
      customLabel: i.customLabel,
      currentValue: i.currentValue,
      ticker: i.ticker,
      investmentType: i.investmentType,
    })),
    creditCards: (input.creditCards ?? []).map((c) => ({
      id: newRowId(),
      bankId: c.bankId,
      bankName: c.bankName,
      bankLogoUrl: c.bankLogoUrl,
      customLabel: c.customLabel,
      balance: c.balance,
      creditLimit: c.creditLimit,
      apr: c.apr,
      cardType: c.cardType,
    })),
    loans: (input.loans ?? []).map((l) => ({
      id: newRowId(),
      customLabel: l.customLabel,
      lenderName: l.lenderName,
      // /loans stores the balance positive but returns it negated for display. A projection
      // ledger keeps debt positive, the same convention NetWorthService uses, so flip it back —
      // otherwise a seeded loan subtracts from liabilities instead of adding to them.
      balance: Math.abs(l.balance),
      interestRate: l.interestRate,
      loanType: l.loanType,
    })),
    pendingItems: (input.pendingItems ?? [])
      .filter((p) => p.status !== 'Settled')
      .map((p) => ({
        id: newRowId(),
        description: p.description,
        counterparty: p.counterparty,
        amount: p.amount,
        // Trimmed to yyyy-MM-dd so <input type="date"> round-trips it without timezone drift.
        dueDate: p.dueDate ? p.dueDate.slice(0, 10) : null,
        status: p.status,
      })),
    properties: (input.properties ?? []).map((p) => ({
      id: newRowId(),
      address: p.address,
      purchasePrice: p.purchasePrice,
      currentEstimatedValue: p.currentEstimatedValue,
      loanBalance: p.loanBalance,
      interestRate: p.interestRate,
      loanType: p.loanType,
      monthlyRent: p.monthlyRent,
      monthlyExpenses: p.monthlyExpenses,
    })),
  };
}

export interface ProjectionNetWorth {
  totalAssets: number;
  totalLiabilities: number;
  liquidNetWorth: number;
  totalNetWorth: number;
  propertyEquity: number;
  hasProperties: boolean;
}

/**
 * Mirrors the server's NetWorthService so the summary bar updates live as rows are edited.
 * ProjectionService recomputes these same figures when a snapshot is saved.
 */
export function computeProjectionNetWorth(state: ProjectionState): ProjectionNetWorth {
  const accountBalance = state.accounts.reduce((s, a) => s + a.balance, 0);
  const investmentValue = state.investments.reduce((s, i) => s + i.currentValue, 0);
  const creditUsed = state.creditCards.reduce((s, c) => s + c.balance, 0);
  const loanBalance = state.loans.reduce((s, l) => s + l.balance, 0);

  const pendingNet = state.pendingItems
    .filter((p) => p.status !== 'Settled')
    .reduce((s, p) => s + p.amount, 0);

  const propertyEquity = state.properties.reduce(
    (s, p) => s + (p.currentEstimatedValue - p.loanBalance),
    0,
  );

  const pendingAsset = pendingNet > 0 ? pendingNet : 0;
  const pendingLiability = pendingNet < 0 ? -pendingNet : 0;

  const totalAssets = accountBalance + investmentValue + pendingAsset;
  const totalLiabilities = creditUsed + loanBalance + pendingLiability;
  const liquidNetWorth = totalAssets - totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    liquidNetWorth,
    totalNetWorth: liquidNetWorth + propertyEquity,
    propertyEquity,
    hasProperties: state.properties.length > 0,
  };
}

/** Monthly cash flow for a projection property — the real Property DTO ships this precomputed. */
export function propertyCashFlow(p: { monthlyRent: number; monthlyExpenses: number }): number {
  return p.monthlyRent - p.monthlyExpenses;
}
