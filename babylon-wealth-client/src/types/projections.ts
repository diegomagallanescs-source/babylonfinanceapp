// Types for the Projections tab.
//
// A projection owns a private copy of the accounting ledger. These rows look like the
// ledger DTOs but their `id`s are client-generated strings, not database keys — nothing
// here maps back to a real account, and editing them never touches the Accounting tab.

export type ProjectionSnapshotKind = 'Projected' | 'Realized';

// ── Ledger rows ──────────────────────────────────────────────
export interface ProjectionAccountRow {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  balance: number;
  accountType: string;
  budgetCategoryId: string | null;
}

export interface ProjectionInvestmentRow {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  currentValue: number;
  ticker: string | null;
  investmentType: string;
}

export interface ProjectionCreditCardRow {
  id: string;
  bankId: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  customLabel: string;
  balance: number;
  creditLimit: number;
  apr: number;
  cardType: string;
}

export interface ProjectionLoanRow {
  id: string;
  customLabel: string;
  lenderName: string;
  balance: number;
  interestRate: number;
  loanType: string;
}

export interface ProjectionPendingRow {
  id: string;
  description: string;
  counterparty: string | null;
  amount: number;
  dueDate: string | null;
  status: string;
}

export interface ProjectionPropertyRow {
  id: string;
  address: string;
  purchasePrice: number;
  currentEstimatedValue: number;
  loanBalance: number;
  interestRate: number;
  loanType: string;
  monthlyRent: number;
  monthlyExpenses: number;
}

/** The complete ledger for one projection. */
export interface ProjectionState {
  accounts: ProjectionAccountRow[];
  investments: ProjectionInvestmentRow[];
  creditCards: ProjectionCreditCardRow[];
  loans: ProjectionLoanRow[];
  pendingItems: ProjectionPendingRow[];
  properties: ProjectionPropertyRow[];
}

export const EMPTY_PROJECTION_STATE: ProjectionState = {
  accounts: [],
  investments: [],
  creditCards: [],
  loans: [],
  pendingItems: [],
  properties: [],
};

// ── API shapes ───────────────────────────────────────────────
export interface ProjectionSummaryDto {
  id: string;
  name: string;
  description: string | null;
  snapshotCount: number;
  projectedCount: number;
  realizedCount: number;
  latestSnapshotDate: string | null;
  latestTotalNetWorth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectionSnapshotDto {
  id: string;
  projectionId: string;
  snapshotDate: string;
  kind: ProjectionSnapshotKind;
  notes: string | null;
  liquidNetWorth: number;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  state: ProjectionState;
  createdAt: string;
}

export interface ProjectionDetailDto {
  id: string;
  name: string;
  description: string | null;
  workspace: ProjectionState;
  snapshots: ProjectionSnapshotDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectionRequest {
  name: string;
  description?: string | null;
  state?: ProjectionState;
}

export interface UpdateProjectionRequest {
  name: string;
  description?: string | null;
}

export interface CreateProjectionSnapshotRequest {
  snapshotDate: string;
  kind: ProjectionSnapshotKind;
  notes?: string | null;
  state?: ProjectionState;
}
