import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../../utils/format';
import { analyzeProperty } from '../../api/realEstate';
import { useProperties } from '../../hooks/useProperties';
import { useCreateProperty } from '../../hooks/useCreateProperty';
import { useDeleteProperty } from '../../hooks/useDeleteProperty';
import type { PropertyAnalysisResponseDto } from '../../types/realEstate';
import type { PropertyResponseDto } from '../../types/ledger';
import { STATE_GUIDES, INVESTOR_TIPS } from '../../constants/realEstateGuide';
import type { StateGuide } from '../../constants/realEstateGuide';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import './RealEstatePage.css';

// ── Constants ─────────────────────────────────────────────────

interface LoanTypeInfo { value: string; label: string; badge: string; description: string; }

const LOAN_TYPES: LoanTypeInfo[] = [
  {
    value: 'Conventional', label: 'Conventional', badge: 'CONV',
    description: 'Standard mortgage backed by private lenders. 20%+ down avoids PMI. Best rates for strong credit scores (720+). Most common loan type for investment properties.',
  },
  {
    value: 'FHA', label: 'FHA', badge: 'FHA',
    description: 'Government-backed loan. Min 3.5% down with 580+ credit score. Requires Mortgage Insurance Premium (MIP) of ~0.55% annually. Good for lower down payments.',
  },
  {
    value: 'VA', label: 'VA', badge: 'VA',
    description: 'Veterans Affairs loan for eligible veterans and service members. 0% down required. No PMI. Competitive rates. Must be primary residence for initial purchase.',
  },
  {
    value: 'DSCR', label: 'DSCR', badge: 'DSCR',
    description: "Debt Service Coverage Ratio loan. Underwritten on the property's rental income, not your personal income. Ideal for investors with multiple properties. Typically requires DSCR ≥ 1.25.",
  },
];

const METRIC_TOOLTIPS: Record<string, string> = {
  capRate:    "Annual net operating income ÷ purchase price. Measures the property's return as an asset, independent of financing. 5%+ is generally solid.",
  cashOnCash: 'Annual cash flow ÷ total cash invested (your down payment). Shows the actual cash return on your money. Aim for 8%+ in most markets.',
  dscr:       'Net operating income ÷ annual debt service. A ratio above 1.0 means rent covers the mortgage. Lenders typically require ≥ 1.25 for investment loans.',
  grm:        'Purchase price ÷ annual gross rent. Lower is better — a GRM under 15× is generally favorable. Quick sanity check before running full numbers.',
  breakEven:  'Minimum monthly rent needed to cover all expenses. If market rent is below this number, the deal loses money every month.',
};

// ── Form state ────────────────────────────────────────────────

interface FormState {
  address: string;
  purchasePrice: string;
  downDollar: string;
  downPercent: string;
  loanType: string;
  interestRate: string;
  termYears: string;
  monthlyRent: string;
  vacancyRate: string;
  propertyTax: string;
  insurance: string;
  hoa: string;
  maintenancePercent: string;
}

const INITIAL_FORM: FormState = {
  address: '',
  purchasePrice: '',
  downDollar: '',
  downPercent: '',
  loanType: 'Conventional',
  interestRate: '',
  termYears: '30',
  monthlyRent: '',
  vacancyRate: '5',
  propertyTax: '',
  insurance: '',
  hoa: '0',
  maintenancePercent: '1',
};

// ── Helpers ───────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function liveFormatDollar(raw: string): string {
  const stripped = raw.replace(/[^0-9.]/g, '');
  if (!stripped || stripped === '.') return stripped;
  const dotIdx = stripped.indexOf('.');
  const intPart  = dotIdx >= 0 ? stripped.slice(0, dotIdx) : stripped;
  const decPart  = dotIdx >= 0 ? stripped.slice(dotIdx) : '';
  const intNum   = intPart === '' ? 0 : parseInt(intPart, 10);
  const formatted = isNaN(intNum) ? intPart : intNum.toLocaleString('en-US');
  return formatted + decPart;
}

function isFormReady(f: FormState): boolean {
  return (
    parseNum(f.purchasePrice) > 0 &&
    parseNum(f.downDollar) >= 0 &&
    parseNum(f.interestRate) > 0 &&
    parseNum(f.termYears) > 0
  );
}

function isStale(property: PropertyResponseDto, days = 90): boolean {
  const refDate = property.lastValueUpdateDate ?? property.createdAt;
  return Date.now() - new Date(refDate).getTime() > days * 86_400_000;
}

function normalizeLoanType(stored: string): string {
  if (stored.toLowerCase().startsWith('conventional')) return 'Conventional';
  if (stored.toLowerCase().startsWith('fha'))          return 'FHA';
  if (stored.toLowerCase().startsWith('va'))           return 'VA';
  if (stored.toLowerCase().startsWith('dscr'))         return 'DSCR';
  return 'Conventional';
}

const SIGNAL_META = {
  Green:  { emoji: '🟢', label: 'Strong Deal',   cls: 're-signal--green'  },
  Yellow: { emoji: '🟡', label: 'Marginal Deal', cls: 're-signal--yellow' },
  Red:    { emoji: '🔴', label: 'Weak Deal',      cls: 're-signal--red'   },
} as const;

// ── Small reusable components ─────────────────────────────────

function MetricTooltip({ text }: { text: string }) {
  return (
    <span className="re-tip-wrap">
      <span className="re-tip-trigger">?</span>
      <span className="re-tip-box">{text}</span>
    </span>
  );
}

function MetricCard({
  label, value, unit, tooltip, highlight,
}: {
  label: string; value: string; unit?: string; tooltip: string; highlight?: boolean;
}) {
  return (
    <div className={`re-metric-card${highlight ? ' re-metric-card--highlight' : ''}`}>
      <div className="re-metric-card__label">
        {label}
        <MetricTooltip text={tooltip} />
      </div>
      <div className="re-metric-card__value">
        {value}
        {unit && <span className="re-metric-card__unit">{unit}</span>}
      </div>
    </div>
  );
}

// ── LoanSummaryPanel ──────────────────────────────────────────

function SummaryRow({
  label, value, loading, size = 'md', gold, muted,
}: {
  label: string; value: string; loading?: boolean;
  size?: 'sm' | 'md' | 'lg'; gold?: boolean; muted?: boolean;
}) {
  return (
    <div className="re-summary-row">
      <span className="re-summary-row__label" dangerouslySetInnerHTML={{ __html: label }} />
      {loading ? (
        <span className={`re-summary-row__skel re-summary-row__skel--${size}`} />
      ) : (
        <span className={[
          `re-summary-row__value re-summary-row__value--${size}`,
          gold ? 're-summary-row__value--gold' : '',
          muted ? 're-summary-row__value--muted' : '',
        ].join(' ')}>
          {value}
        </span>
      )}
    </div>
  );
}

function LoanSummaryPanel({ result, loading }: { result: PropertyAnalysisResponseDto | null; loading: boolean }) {
  const closingCostEst = result ? (result.loanAmount + result.cashToClose) * 0.03 : 0;
  const cashToCloseTotal = result ? result.cashToClose + closingCostEst : 0;

  return (
    <div className={`re-summary-panel${loading ? ' re-summary-panel--loading' : ''}`}>
      <div className="re-summary-panel__header">
        <span className="re-summary-panel__title">Loan Summary</span>
        {loading && <span className="re-summary-panel__analyzing">Analyzing…</span>}
      </div>

      {!result && !loading ? (
        <div className="re-summary-panel__empty">Fill in the form to see your loan numbers.</div>
      ) : (
        <div className="re-summary-panel__rows">
          <SummaryRow label="Loan Amount"              value={result ? formatCurrency(result.loanAmount) : '—'}                  loading={loading} size="sm" />
          <SummaryRow label="Monthly P&amp;I"          value={result ? formatCurrency(result.monthlyPrincipalAndInterest) : '—'} loading={loading} size="lg" gold />
          <SummaryRow label="Estimated Total Interest" value={result ? formatCurrency(result.estimatedTotalInterest) : '—'}      loading={loading} size="sm" muted />
          <div className="re-summary-panel__divider" />
          <SummaryRow label="Down Payment"             value={result ? formatCurrency(result.cashToClose) : '—'}                 loading={loading} size="sm" />
          <SummaryRow label="Closing Costs (~3%)"      value={result ? formatCurrency(closingCostEst) : '—'}                    loading={loading} size="sm" muted />
          <SummaryRow label="Cash to Close"            value={result ? formatCurrency(cashToCloseTotal) : '—'}                   loading={loading} size="md" />
        </div>
      )}

      {result && (
        <div className="re-summary-panel__note">
          Closing costs estimated at 3% of purchase price. Actual costs vary (title, escrow, lender fees, etc.).
        </div>
      )}
    </div>
  );
}

// ── DealResultsPanel ──────────────────────────────────────────

function DealResultsPanel({
  result,
  onSave,
  saving,
  saved,
  saveError,
}: {
  result: PropertyAnalysisResponseDto;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
}) {
  const signal = SIGNAL_META[result.dealSignal] ?? SIGNAL_META.Red;
  const cashFlowPositive = result.monthlyCashFlow >= 0;

  return (
    <div className="re-results-card">

      {/* Deal signal banner */}
      <div className={`re-signal ${signal.cls}`}>
        <span className="re-signal__emoji">{signal.emoji}</span>
        <div>
          <div className="re-signal__label">{signal.label}</div>
          <div className="re-signal__explanation">{result.dealSignalExplanation}</div>
        </div>
      </div>

      {/* Monthly cash flow — hero number */}
      <div className="re-cashflow">
        <div className="re-cashflow__label">Monthly Cash Flow</div>
        <div className={`re-cashflow__value${cashFlowPositive ? ' re-cashflow__value--pos' : ' re-cashflow__value--neg'}`}>
          {cashFlowPositive ? '+' : ''}{formatCurrency(result.monthlyCashFlow)}
        </div>
        <div className="re-cashflow__sub">per month · {formatCurrency(result.annualCashFlow * (cashFlowPositive ? 1 : 1))} / year</div>
      </div>

      {/* Metrics grid */}
      <div className="re-metrics-grid">
        <MetricCard label="Cap Rate"             value={`${result.capRatePercent.toFixed(2)}%`}           tooltip={METRIC_TOOLTIPS.capRate}    highlight={result.capRatePercent >= 5} />
        <MetricCard label="Cash-on-Cash Return"  value={`${result.cashOnCashReturnPercent.toFixed(2)}%`}  tooltip={METRIC_TOOLTIPS.cashOnCash} highlight={result.cashOnCashReturnPercent >= 8} />
        <MetricCard label="DSCR"                 value={result.debtServiceCoverageRatio.toFixed(2)}        tooltip={METRIC_TOOLTIPS.dscr}       highlight={result.debtServiceCoverageRatio >= 1.25} />
        <MetricCard label="GRM"                  value={`${result.grossRentMultiplier.toFixed(1)}×`}       tooltip={METRIC_TOOLTIPS.grm} />
        <MetricCard label="Break-Even Rent"      value={formatCurrency(result.breakEvenRent)}              tooltip={METRIC_TOOLTIPS.breakEven} />
      </div>

      {/* Expense breakdown sub-line */}
      <div className="re-expense-line">
        Total monthly expenses: <strong>{formatCurrency(result.totalMonthlyExpenses)}</strong>
        &nbsp;·&nbsp;
        Effective rent: <strong>{formatCurrency(result.effectiveMonthlyRent)}</strong>
        &nbsp;(after {((1 - result.effectiveMonthlyRent / result.grossMonthlyRent) * 100).toFixed(0)}% vacancy)
      </div>

      {/* Amortization table (collapsible) */}
      {result.firstTwelveMonths.length > 0 && (
        <details className="re-amort">
          <summary className="re-amort__toggle">
            Amortization Schedule — First 12 Months
          </summary>
          <div className="re-amort__wrap">
            <table className="re-amort__table">
              <thead>
                <tr>
                  <th>Mo</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.firstTwelveMonths.map(row => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{formatCurrency(row.payment)}</td>
                    <td className="re-amort__principal">{formatCurrency(row.principal)}</td>
                    <td className="re-amort__interest">{formatCurrency(row.interest)}</td>
                    <td>{formatCurrency(row.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Save action */}
      <div className="re-results-actions">
        {saveError && <div className="banner banner--error">{saveError}</div>}
        <button
          className="btn btn--primary re-save-btn"
          onClick={onSave}
          disabled={saving || saved}
        >
          {saved ? '✓ Saved to Portfolio' : saving ? 'Saving…' : 'Save to Portfolio →'}
        </button>
        <span className="re-save-hint">Address from the form is used as the property label.</span>
      </div>
    </div>
  );
}

// ── SavedPropertiesGrid ───────────────────────────────────────

function PropertyCard({
  property,
  onEdit,
  onDelete,
  deleting,
}: {
  property: PropertyResponseDto;
  onEdit: (p: PropertyResponseDto) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const stale = isStale(property);
  const cashFlowPos = property.monthlyCashFlow >= 0;

  return (
    <div className="re-prop-card">
      {stale && (
        <div className="re-prop-card__stale">
          ⚠ Estimated value not updated in 90+ days
        </div>
      )}

      <div className="re-prop-card__address">{property.address || 'Unnamed Property'}</div>

      <div className="re-prop-card__rows">
        <div className="re-prop-card__row">
          <span>Purchase Price</span>
          <span>{formatCurrency(property.purchasePrice)}</span>
        </div>
        <div className="re-prop-card__row">
          <span>Estimated Value</span>
          <span>{formatCurrency(property.currentEstimatedValue)}</span>
        </div>
        <div className="re-prop-card__row">
          <span>Equity</span>
          <span className="re-prop-card__equity">{formatCurrency(property.equity)}</span>
        </div>
        <div className="re-prop-card__row">
          <span>Monthly Rent</span>
          <span>{formatCurrency(property.monthlyRent)}</span>
        </div>
        <div className="re-prop-card__divider" />
        <div className="re-prop-card__row">
          <span>Cash Flow / mo</span>
          <span className={cashFlowPos ? 're-prop-card__pos' : 're-prop-card__neg'}>
            {cashFlowPos ? '+' : ''}{formatCurrency(property.monthlyCashFlow)}
          </span>
        </div>
      </div>

      <div className="re-prop-card__actions">
        <button
          className="btn btn--secondary re-prop-card__edit"
          onClick={() => onEdit(property)}
        >
          Edit
        </button>
        <button
          className="btn btn--danger re-prop-card__delete"
          onClick={() => onDelete(property.id)}
          disabled={deleting}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function SavedPropertiesGrid({
  onEdit,
}: {
  onEdit: (p: PropertyResponseDto) => void;
}) {
  const { data: properties = [], isLoading } = useProperties();
  const deleteProperty = useDeleteProperty();

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this property from your portfolio?')) return;
    deleteProperty.mutate(id);
  };

  return (
    <div className="re-saved-section">
      <div className="re-saved-section__header">
        <h2 className="re-saved-section__title">Saved Properties</h2>
        {properties.length > 0 && (
          <span className="re-saved-section__count">{properties.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="re-saved-grid">
          {[1, 2].map(i => <div key={i} className="re-prop-card-skel" />)}
        </div>
      ) : properties.length === 0 ? (
        <div className="re-saved-empty">
          <div className="re-saved-empty__icon">🏠</div>
          <div className="re-saved-empty__text">No properties saved yet.</div>
          <div className="re-saved-empty__sub">Run a deal analysis above, then click "Save to Portfolio."</div>
        </div>
      ) : (
        <div className="re-saved-grid">
          {properties.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={onEdit}
              onDelete={handleDelete}
              deleting={deleteProperty.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Investor Knowledge Base ───────────────────────────────────

const RATING_META = {
  high:   { label: 'Landlord-Friendly', cls: 're-state-badge--high'   },
  medium: { label: 'Moderate',          cls: 're-state-badge--medium' },
  low:    { label: 'Tenant-Friendly',   cls: 're-state-badge--low'    },
} as const;

function StateGuideCard({ state }: { state: StateGuide }) {
  const rating = RATING_META[state.landlordRating];
  return (
    <div className="re-state-card">
      <div className="re-state-card__header">
        <div>
          <div className="re-state-card__name">{state.name}</div>
          <div className="re-state-card__abbr">{state.abbr}</div>
        </div>
        <span className={`re-state-badge ${rating.cls}`}>{rating.label}</span>
      </div>

      <div className="re-state-lists">
        <div className="re-state-list re-state-list--pros">
          <div className="re-state-list__title">✅ Pros for Investors</div>
          <ul>{state.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div className="re-state-list re-state-list--cons">
          <div className="re-state-list__title">❌ Cons & Challenges</div>
          <ul>{state.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
        <div className="re-state-list re-state-list--watch">
          <div className="re-state-list__title">🔍 What to Watch in Your Deal</div>
          <ul>{state.dealWatch.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
        <div className="re-state-list re-state-list--warn">
          <div className="re-state-list__title">⚠️ Be Wary Of</div>
          <ul>{state.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function InvestorKnowledgeBase() {
  const [query, setQuery]           = useState('');
  const [selected, setSelected]     = useState<StateGuide | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? STATE_GUIDES.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.abbr.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (s: StateGuide) => {
    setSelected(s);
    setQuery(s.name);
    setDropdownOpen(false);
  };

  return (
    <div className="re-knowledge-section">
      <div className="re-knowledge-header">
        <h2 className="re-knowledge-title">Investor Knowledge Base</h2>
        <p className="re-knowledge-sub">State-specific investor profiles + general investing principles.</p>
      </div>

      <div className="re-knowledge-grid">

        {/* ── State Guide ── */}
        <div className="re-state-guide">
          <div className="re-state-guide__label">Search by State</div>
          <div className="re-state-search-wrap" ref={wrapRef}>
            <input
              className="re-state-input"
              type="text"
              placeholder="e.g. Texas or TX"
              value={query}
              onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
              onFocus={() => { if (query.length >= 1) setDropdownOpen(true); }}
            />
            {dropdownOpen && filtered.length > 0 && (
              <div className="re-state-dropdown">
                {filtered.map(s => (
                  <button
                    key={s.abbr}
                    className={`re-state-dropdown__item${selected?.abbr === s.abbr ? ' re-state-dropdown__item--active' : ''}`}
                    onClick={() => handleSelect(s)}
                    type="button"
                  >
                    <span className="re-state-dropdown__abbr">{s.abbr}</span>
                    <span className="re-state-dropdown__name">{s.name}</span>
                    <span className={`re-state-badge re-state-badge--sm ${RATING_META[s.landlordRating].cls}`}>
                      {s.landlordRating === 'high' ? '🟢' : s.landlordRating === 'medium' ? '🟡' : '🔴'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected
            ? <StateGuideCard state={selected} />
            : (
              <div className="re-state-empty">
                <div className="re-state-empty__icon">🗺️</div>
                <div className="re-state-empty__text">Search for a state to see the investor profile.</div>
                <div className="re-state-empty__sub">Covers landlord-tenant laws, market risks, deal-specific watchpoints, and investor warnings for all 50 states.</div>
              </div>
            )
          }
        </div>

        {/* ── General Tips ── */}
        <div className="re-general-tips">
          <div className="re-general-tips__title">Core Investor Principles</div>
          <div className="re-tips-list">
            {INVESTOR_TIPS.map((tip, i) => (
              <div key={i} className="re-tip-item">
                <div className="re-tip-item__icon">{tip.icon}</div>
                <div className="re-tip-item__content">
                  <div className="re-tip-item__title">{tip.title}</div>
                  <div className="re-tip-item__body">{tip.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export function RealEstatePage() {
  const [form, setForm]         = useState<FormState>(INITIAL_FORM);
  const [result, setResult]     = useState<PropertyAnalysisResponseDto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef     = useRef<HTMLDivElement>(null);

  const createProperty = useCreateProperty();

  // ── Down payment linked inputs ────────────────────────────

  const syncDownFromDollar = useCallback((d: string, p: string) => {
    const dollar = parseNum(d), price = parseNum(p);
    return price > 0 && d !== '' ? (dollar / price * 100).toFixed(2) : '';
  }, []);

  const syncDownFromPercent = useCallback((pct: string, p: string) => {
    const percent = parseNum(pct), price = parseNum(p);
    return price > 0 && pct !== '' ? (percent / 100 * price).toFixed(2) : '';
  }, []);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'purchasePrice') {
        if (prev.downPercent) next.downDollar = syncDownFromPercent(prev.downPercent, value);
        else if (prev.downDollar) next.downPercent = syncDownFromDollar(prev.downDollar, value);
      }
      if (key === 'downDollar')  next.downPercent = syncDownFromDollar(value, prev.purchasePrice);
      if (key === 'downPercent') next.downDollar  = syncDownFromPercent(value, prev.purchasePrice);
      return next;
    });
  }, [syncDownFromDollar, syncDownFromPercent]);

  // ── Debounced analysis ────────────────────────────────────

  const runAnalysis = useCallback(async (f: FormState) => {
    setAnalyzeError(null);
    try {
      const data = await analyzeProperty({
        purchasePrice:             parseNum(f.purchasePrice),
        downPaymentAmount:         parseNum(f.downDollar),
        loanType:                  f.loanType,
        interestRate:              parseNum(f.interestRate) / 100,
        loanTermYears:             parseNum(f.termYears),
        monthlyPropertyTax:        parseNum(f.propertyTax),
        monthlyInsurance:          parseNum(f.insurance),
        monthlyHoa:                parseNum(f.hoa),
        expectedMonthlyRent:       parseNum(f.monthlyRent),
        vacancyRatePercent:        parseNum(f.vacancyRate) / 100,
        maintenanceReservePercent: parseNum(f.maintenancePercent) / 100,
      });
      setResult(data);
      setSaved(false);
    } catch {
      setAnalyzeError('Analysis failed. Check your inputs and try again.');
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isFormReady(form)) { setResult(null); setAnalyzing(false); return; }
    setAnalyzing(true);
    debounceRef.current = setTimeout(() => runAnalysis(form), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form, runAnalysis]);

  // ── Manual analyze ────────────────────────────────────────

  const handleAnalyze = useCallback(() => {
    if (!isFormReady(form) || analyzing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAnalyzing(true);
    runAnalysis(form);
  }, [form, analyzing, runAnalysis]);

  // ── Save to portfolio ─────────────────────────────────────

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    setSaveError(null);
    const maintenanceMo = parseNum(form.maintenancePercent) / 100 * parseNum(form.purchasePrice) / 12;
    const monthlyExpenses = parseNum(form.propertyTax) + parseNum(form.insurance) + parseNum(form.hoa) + maintenanceMo;
    try {
      await createProperty.mutateAsync({
        address:               form.address.trim() || 'Unnamed Property',
        purchasePrice:         parseNum(form.purchasePrice),
        currentEstimatedValue: parseNum(form.purchasePrice),
        loanBalance:           parseNum(form.purchasePrice) - parseNum(form.downDollar),
        interestRate:          parseNum(form.interestRate) / 100,
        loanType:              form.loanType,
        monthlyRent:           parseNum(form.monthlyRent),
        monthlyExpenses,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit — prefill form from saved property ───────────────

  const handleEdit = useCallback((property: PropertyResponseDto) => {
    const downDollar = (property.purchasePrice - property.loanBalance).toFixed(2);
    const downPercent = property.purchasePrice > 0
      ? ((property.purchasePrice - property.loanBalance) / property.purchasePrice * 100).toFixed(2)
      : '';
    setForm({
      address:           property.address,
      purchasePrice:     String(property.purchasePrice),
      downDollar,
      downPercent,
      loanType:          normalizeLoanType(property.loanType),
      interestRate:      property.interestRate ? String(parseFloat((property.interestRate * 100).toFixed(3))) : '',
      termYears:         '30',
      monthlyRent:       String(property.monthlyRent),
      vacancyRate:       '5',
      propertyTax:       String(property.monthlyExpenses),
      insurance:         '0',
      hoa:               '0',
      maintenancePercent:'1',
    });
    setResult(null);
    setSaved(false);
    setSaveError(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="re-page">

      <div className="re-page-header">
        <h1 className="re-page-title">
          Real Estate Analyzer
          <PageInfoTooltip content={
            <>
              <p>Real estate is a generator of wealth. Unlike a paycheck, a rental property can pay you forever — while appreciating in value.</p>
              <p>Use the <strong>Deal Calculator</strong> to analyze any property before you buy: cash flow, cap rate, DSCR, break-even rent, and more.</p>
              <p>Save deals to your <strong>portfolio</strong> and browse the <strong>Investor Knowledge Base</strong> for state-specific landlord laws and investing principles.</p>
            </>
          } />
        </h1>
      </div>

      {/* ── Form + Loan Summary ── */}
      <div className="re-main-grid" ref={formRef}>

        <div className="re-form-card">
          <div className="re-form-card__header">
            <span className="re-form-card__title">Deal Calculator</span>
            {analyzing && <span className="re-form__pulse">●</span>}
          </div>

          <fieldset className="re-fieldset">
            <legend className="re-legend">Property &amp; Loan</legend>

            {/* Address */}
            <div className="re-field re-field--full">
              <label className="re-label">
                Property Address
                <span className="re-label__hint">optional — used as portfolio label</span>
              </label>
              <div className="re-input-wrap">
                <input
                  type="text"
                  className="re-input"
                  placeholder="123 Main St, Chino Hills CA"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                />
              </div>
            </div>

            {/* Purchase Price + Down Payment */}
            <div className="re-field-row">
              <div className="re-field re-field--grow">
                <label className="re-label">Purchase Price</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="350,000"
                    value={form.purchasePrice}
                    onChange={e => setField('purchasePrice', liveFormatDollar(e.target.value))} />
                </div>
              </div>
              <div className="re-field re-field--grow">
                <label className="re-label">Down Payment ($)</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="70,000"
                    value={form.downDollar}
                    onChange={e => setField('downDollar', liveFormatDollar(e.target.value))} />
                </div>
              </div>
              <div className="re-field re-field--narrow">
                <label className="re-label">Down (%)</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input type="number" className="re-input" placeholder="20"
                    min={0} max={100} step={0.5} value={form.downPercent}
                    onChange={e => setField('downPercent', e.target.value)} />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* Loan Type */}
            <div className="re-field re-field--full">
              <label className="re-label">Loan Type</label>
              <div className="re-loan-types">
                {LOAN_TYPES.map(lt => (
                  <button key={lt.value}
                    className={`re-loan-type-btn${form.loanType === lt.value ? ' re-loan-type-btn--active' : ''}`}
                    onClick={() => setField('loanType', lt.value)} type="button">
                    <span className="re-loan-type-badge">{lt.badge}</span>
                    <span className="re-loan-type-label">{lt.label}</span>
                  </button>
                ))}
              </div>
              <div className="re-loan-type-desc">
                {LOAN_TYPES.find(lt => lt.value === form.loanType)?.description}
              </div>
            </div>

            {/* Rate + Term */}
            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">Interest Rate</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input type="number" className="re-input" placeholder="6.5"
                    min={0} max={30} step={0.125} value={form.interestRate}
                    onChange={e => setField('interestRate', e.target.value)} />
                  <span>%</span>
                </div>
              </div>
              <div className="re-field">
                <label className="re-label">Loan Term</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input type="number" className="re-input" placeholder="30"
                    min={5} max={40} step={5} value={form.termYears}
                    onChange={e => setField('termYears', e.target.value)} />
                  <span>yrs</span>
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="re-fieldset">
            <legend className="re-legend">Income &amp; Expenses</legend>

            <div className="re-field-row">
              <div className="re-field re-field--grow">
                <label className="re-label">Monthly Rent</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="2,400"
                    value={form.monthlyRent}
                    onChange={e => setField('monthlyRent', liveFormatDollar(e.target.value))} />
                </div>
              </div>
              <div className="re-field">
                <label className="re-label">Vacancy Rate</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input type="number" className="re-input" placeholder="5"
                    min={0} max={50} step={1} value={form.vacancyRate}
                    onChange={e => setField('vacancyRate', e.target.value)} />
                  <span>%</span>
                </div>
              </div>
            </div>

            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">Property Tax / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="350"
                    value={form.propertyTax}
                    onChange={e => setField('propertyTax', liveFormatDollar(e.target.value))} />
                </div>
              </div>
              <div className="re-field">
                <label className="re-label">Insurance / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="120"
                    value={form.insurance}
                    onChange={e => setField('insurance', liveFormatDollar(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">HOA / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input type="text" inputMode="decimal" className="re-input" placeholder="0"
                    value={form.hoa}
                    onChange={e => setField('hoa', liveFormatDollar(e.target.value))} />
                </div>
              </div>
              <div className="re-field">
                <label className="re-label">
                  Maintenance Reserve
                  <span className="re-label__hint">% of price / yr</span>
                </label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input type="number" className="re-input" placeholder="1"
                    min={0} max={10} step={0.25} value={form.maintenancePercent}
                    onChange={e => setField('maintenancePercent', e.target.value)} />
                  <span>%</span>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="re-analyze-row">
            <button
              className="btn btn--primary re-analyze-btn"
              onClick={handleAnalyze}
              disabled={!isFormReady(form) || analyzing}
              type="button"
            >
              {analyzing ? 'Analyzing…' : 'Analyze Deal →'}
            </button>
            {!isFormReady(form) && (
              <span className="re-analyze-hint">Fill in price, rate, and rent to analyze.</span>
            )}
          </div>

          {analyzeError && <div className="banner banner--error">{analyzeError}</div>}
        </div>

        <LoanSummaryPanel result={result} loading={analyzing} />
      </div>

      {/* ── Deal Results Panel ── */}
      {result && (
        <DealResultsPanel
          result={result}
          onSave={handleSave}
          saving={saving}
          saved={saved}
          saveError={saveError}
        />
      )}

      {/* ── Saved Properties ── */}
      <SavedPropertiesGrid onEdit={handleEdit} />

      {/* ── Investor Knowledge Base ── */}
      <InvestorKnowledgeBase />

    </div>
  );
}
