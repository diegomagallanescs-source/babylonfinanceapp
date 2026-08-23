/**
 * Non-component accounting helpers shared by the Accounting tab and the Projections
 * workspace. Kept out of AccountingBits.tsx so that file only exports components.
 */

// ── Dropdown option lists ─────────────────────────────────────
export const ACCT_TYPES = ['Checking', 'Savings', 'Money Market', 'CD', 'Other'];
export const LOAN_TYPES = ['Mortgage', 'Auto', 'Student', 'Personal', 'HELOC', 'Business', 'Other'];
export const INVESTMENT_TYPES = ['Brokerage', 'Retirement401k', 'RothIRA', 'TraditionalIRA', 'HSA', 'Crypto', 'Other'];
export const LOAN_PRODUCT_TYPES = ['Conventional', 'FHA', 'VA', 'DSCR', 'Cash'];

// ── Bank logo ─────────────────────────────────────────────────
export function resolveLogo(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('logo.clearbit.com/')) {
    const domain = url.split('logo.clearbit.com/')[1];
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  return url;
}

// ── Deal signal ───────────────────────────────────────────────
export interface DealSignalInput {
  purchasePrice: number;
  monthlyRent: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
}

export function getDealSignal(p: DealSignalInput): 'green' | 'yellow' | 'red' {
  const annualNOI = (p.monthlyRent - p.monthlyExpenses) * 12;
  const capRate = p.purchasePrice > 0 ? (annualNOI / p.purchasePrice) * 100 : 0;
  if (p.monthlyCashFlow > 0 && capRate >= 5) return 'green';
  if (p.monthlyCashFlow > 0 || capRate >= 4) return 'yellow';
  return 'red';
}

export const SIGNAL_LABEL = { green: '🟢 Strong Deal', yellow: '🟡 Marginal', red: '🔴 Weak Deal' };
