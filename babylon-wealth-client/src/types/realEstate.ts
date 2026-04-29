// ── Request ───────────────────────────────────────────────────
export interface PropertyAnalysisRequest {
  purchasePrice: number;
  downPaymentAmount: number;
  loanType: string;            // 'Conventional' | 'FHA' | 'VA' | 'DSCR'
  interestRate: number;        // decimal — e.g. 0.065 for 6.5%
  loanTermYears: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  expectedMonthlyRent: number;
  vacancyRatePercent: number;          // decimal — e.g. 0.05 for 5%
  maintenanceReservePercent: number;   // decimal — e.g. 0.01 for 1% of purchase price/yr
}

// ── Amortization row ─────────────────────────────────────────
export interface AmortizationRowDto {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

// ── Response ──────────────────────────────────────────────────
export interface PropertyAnalysisResponseDto {
  loanAmount: number;
  monthlyPrincipalAndInterest: number;
  estimatedTotalInterest: number;
  cashToClose: number;

  grossMonthlyRent: number;
  effectiveMonthlyRent: number;
  totalMonthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;

  capRatePercent: number;
  cashOnCashReturnPercent: number;
  grossRentMultiplier: number;
  breakEvenRent: number;
  debtServiceCoverageRatio: number;

  dealSignal: 'Green' | 'Yellow' | 'Red';
  dealSignalExplanation: string;

  firstTwelveMonths: AmortizationRowDto[];
}
