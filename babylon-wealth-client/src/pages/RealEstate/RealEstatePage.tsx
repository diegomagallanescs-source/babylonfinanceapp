import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../../utils/format';
import { analyzeProperty } from '../../api/realEstate';
import type { PropertyAnalysisResponseDto } from '../../types/realEstate';
import './RealEstatePage.css';

// ── Loan type metadata ────────────────────────────────────────

interface LoanTypeInfo {
  value: string;
  label: string;
  badge: string;
  description: string;
}

const LOAN_TYPES: LoanTypeInfo[] = [
  {
    value: 'Conventional',
    label: 'Conventional',
    badge: 'CONV',
    description:
      'Standard mortgage backed by private lenders. 20%+ down avoids PMI. Best rates for strong credit scores (720+). Most common loan type for investment properties.',
  },
  {
    value: 'FHA',
    label: 'FHA',
    badge: 'FHA',
    description:
      'Government-backed loan. Minimum 3.5% down with a 580+ credit score. Requires Mortgage Insurance Premium (MIP) of ~0.55% annually. Good for lower down payments.',
  },
  {
    value: 'VA',
    label: 'VA',
    badge: 'VA',
    description:
      'Veterans Affairs loan for eligible veterans and service members. 0% down payment required. No PMI. Competitive rates. Must be primary residence for initial purchase.',
  },
  {
    value: 'DSCR',
    label: 'DSCR',
    badge: 'DSCR',
    description:
      "Debt Service Coverage Ratio loan. Underwritten on the property's rental income, not your personal income. Ideal for investors with multiple properties. Typically requires DSCR ≥ 1.25.",
  },
];

// ── Form state ────────────────────────────────────────────────

interface FormState {
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

function isFormReadyToAnalyze(f: FormState): boolean {
  return (
    parseNum(f.purchasePrice) > 0 &&
    parseNum(f.downDollar) >= 0 &&
    parseNum(f.interestRate) > 0 &&
    parseNum(f.termYears) > 0 &&
    parseNum(f.monthlyRent) > 0
  );
}

// ── LoanSummaryPanel ──────────────────────────────────────────

interface LoanSummaryPanelProps {
  result: PropertyAnalysisResponseDto | null;
  loading: boolean;
}

function LoanSummaryPanel({ result, loading }: LoanSummaryPanelProps) {
  return (
    <div className={`re-summary-panel ${loading ? 're-summary-panel--loading' : ''}`}>
      <div className="re-summary-panel__header">
        <span className="re-summary-panel__title">Loan Summary</span>
        {loading && <span className="re-summary-panel__analyzing">Analyzing…</span>}
      </div>

      {!result && !loading ? (
        <div className="re-summary-panel__empty">
          Fill in the form to see your loan numbers.
        </div>
      ) : (
        <div className="re-summary-panel__rows">
          <SummaryRow
            label="Loan Amount"
            value={result ? formatCurrency(result.loanAmount) : '—'}
            loading={loading}
            size="sm"
          />
          <SummaryRow
            label="Monthly P&amp;I"
            value={result ? formatCurrency(result.monthlyPrincipalAndInterest) : '—'}
            loading={loading}
            size="lg"
            gold
          />
          <SummaryRow
            label="Estimated Total Interest"
            value={result ? formatCurrency(result.estimatedTotalInterest) : '—'}
            loading={loading}
            size="sm"
            muted
          />
          <div className="re-summary-panel__divider" />
          <SummaryRow
            label="Cash to Close"
            value={result ? formatCurrency(result.cashToClose) : '—'}
            loading={loading}
            size="md"
          />
        </div>
      )}

      {result && (
        <div className="re-summary-panel__note">
          Down payment only. Does not include closing costs (~2–5% of purchase price).
        </div>
      )}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  gold?: boolean;
  muted?: boolean;
}

function SummaryRow({ label, value, loading, size = 'md', gold, muted }: SummaryRowProps) {
  return (
    <div className="re-summary-row">
      <span className="re-summary-row__label" dangerouslySetInnerHTML={{ __html: label }} />
      {loading ? (
        <span className={`re-summary-row__skel re-summary-row__skel--${size}`} />
      ) : (
        <span
          className={`re-summary-row__value re-summary-row__value--${size}${gold ? ' re-summary-row__value--gold' : ''}${muted ? ' re-summary-row__value--muted' : ''}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export function RealEstatePage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<PropertyAnalysisResponseDto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Down payment linked inputs ────────────────────────────

  const syncDownFromDollar = useCallback((dollarStr: string, priceStr: string) => {
    const dollar = parseNum(dollarStr);
    const price = parseNum(priceStr);
    if (price > 0 && dollarStr !== '') {
      return (dollar / price * 100).toFixed(2);
    }
    return '';
  }, []);

  const syncDownFromPercent = useCallback((percentStr: string, priceStr: string) => {
    const pct = parseNum(percentStr);
    const price = parseNum(priceStr);
    if (price > 0 && percentStr !== '') {
      return (pct / 100 * price).toFixed(2);
    }
    return '';
  }, []);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };

      if (key === 'purchasePrice') {
        if (prev.downPercent) {
          next.downDollar = syncDownFromPercent(prev.downPercent, value);
        } else if (prev.downDollar) {
          next.downPercent = syncDownFromDollar(prev.downDollar, value);
        }
      }
      if (key === 'downDollar') {
        next.downPercent = syncDownFromDollar(value, prev.purchasePrice);
      }
      if (key === 'downPercent') {
        next.downDollar = syncDownFromPercent(value, prev.purchasePrice);
      }

      return next;
    });
  }, [syncDownFromDollar, syncDownFromPercent]);

  // ── Debounced analyze call ────────────────────────────────

  const runAnalysis = useCallback(async (f: FormState) => {
    if (!isFormReadyToAnalyze(f)) return;
    setAnalyzing(true);
    setError(null);
    try {
      const req = {
        purchasePrice: parseNum(f.purchasePrice),
        downPaymentAmount: parseNum(f.downDollar),
        loanType: f.loanType,
        interestRate: parseNum(f.interestRate) / 100,
        loanTermYears: parseNum(f.termYears),
        monthlyPropertyTax: parseNum(f.propertyTax),
        monthlyInsurance: parseNum(f.insurance),
        monthlyHoa: parseNum(f.hoa),
        expectedMonthlyRent: parseNum(f.monthlyRent),
        vacancyRatePercent: parseNum(f.vacancyRate) / 100,
        maintenanceReservePercent: parseNum(f.maintenancePercent) / 100,
      };
      const data = await analyzeProperty(req);
      setResult(data);
    } catch {
      setError('Analysis failed. Check your inputs and try again.');
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isFormReadyToAnalyze(form)) {
      setResult(null);
      setAnalyzing(false);
      return;
    }
    setAnalyzing(true);
    debounceRef.current = setTimeout(() => {
      runAnalysis(form);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, runAnalysis]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="re-page">

      {/* ── Page header ── */}
      <div className="re-page-header">
        <div>
          <h1 className="re-page-title">Real Estate Analyzer</h1>
          <p className="re-page-sub">Run deal numbers instantly. No data is saved until you click Save.</p>
        </div>
      </div>

      {/* ── Main grid: form + summary ── */}
      <div className="re-main-grid">

        {/* ─── Deal Calculator Form ─── */}
        <div className="re-form-card">
          <div className="re-form-card__header">
            <span className="re-form-card__title">Deal Calculator</span>
            {analyzing && <span className="re-form__pulse">●</span>}
          </div>

          {/* ── Property Details ── */}
          <fieldset className="re-fieldset">
            <legend className="re-legend">Property &amp; Loan</legend>

            <div className="re-field-row">
              <div className="re-field re-field--grow">
                <label className="re-label">Purchase Price</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="350,000"
                    min={0}
                    step={1000}
                    value={form.purchasePrice}
                    onChange={e => setField('purchasePrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="re-field re-field--grow">
                <label className="re-label">Down Payment ($)</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="70,000"
                    min={0}
                    step={500}
                    value={form.downDollar}
                    onChange={e => setField('downDollar', e.target.value)}
                  />
                </div>
              </div>

              <div className="re-field re-field--narrow">
                <label className="re-label">Down (%)</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input
                    type="number"
                    className="re-input"
                    placeholder="20"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.downPercent}
                    onChange={e => setField('downPercent', e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* Loan Type Selector */}
            <div className="re-field re-field--full">
              <label className="re-label">Loan Type</label>
              <div className="re-loan-types">
                {LOAN_TYPES.map(lt => (
                  <button
                    key={lt.value}
                    className={`re-loan-type-btn${form.loanType === lt.value ? ' re-loan-type-btn--active' : ''}`}
                    onClick={() => setField('loanType', lt.value)}
                    type="button"
                  >
                    <span className="re-loan-type-badge">{lt.badge}</span>
                    <span className="re-loan-type-label">{lt.label}</span>
                  </button>
                ))}
              </div>
              <div className="re-loan-type-desc">
                {LOAN_TYPES.find(lt => lt.value === form.loanType)?.description}
              </div>
            </div>

            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">Interest Rate</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input
                    type="number"
                    className="re-input"
                    placeholder="6.5"
                    min={0}
                    max={30}
                    step={0.125}
                    value={form.interestRate}
                    onChange={e => setField('interestRate', e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="re-field">
                <label className="re-label">Loan Term</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input
                    type="number"
                    className="re-input"
                    placeholder="30"
                    min={5}
                    max={40}
                    step={5}
                    value={form.termYears}
                    onChange={e => setField('termYears', e.target.value)}
                  />
                  <span>yrs</span>
                </div>
              </div>
            </div>
          </fieldset>

          {/* ── Income & Expenses ── */}
          <fieldset className="re-fieldset">
            <legend className="re-legend">Income &amp; Expenses</legend>

            <div className="re-field-row">
              <div className="re-field re-field--grow">
                <label className="re-label">Monthly Rent</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="2,400"
                    min={0}
                    step={50}
                    value={form.monthlyRent}
                    onChange={e => setField('monthlyRent', e.target.value)}
                  />
                </div>
              </div>

              <div className="re-field">
                <label className="re-label">Vacancy Rate</label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input
                    type="number"
                    className="re-input"
                    placeholder="5"
                    min={0}
                    max={50}
                    step={1}
                    value={form.vacancyRate}
                    onChange={e => setField('vacancyRate', e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">Property Tax / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="350"
                    min={0}
                    step={10}
                    value={form.propertyTax}
                    onChange={e => setField('propertyTax', e.target.value)}
                  />
                </div>
              </div>

              <div className="re-field">
                <label className="re-label">Insurance / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="120"
                    min={0}
                    step={10}
                    value={form.insurance}
                    onChange={e => setField('insurance', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="re-field-row">
              <div className="re-field">
                <label className="re-label">HOA / mo</label>
                <div className="re-input-wrap re-input-wrap--prefix">
                  <span>$</span>
                  <input
                    type="number"
                    className="re-input"
                    placeholder="0"
                    min={0}
                    step={10}
                    value={form.hoa}
                    onChange={e => setField('hoa', e.target.value)}
                  />
                </div>
              </div>

              <div className="re-field">
                <label className="re-label">
                  Maintenance Reserve
                  <span className="re-label__hint">% of purchase price / yr</span>
                </label>
                <div className="re-input-wrap re-input-wrap--suffix">
                  <input
                    type="number"
                    className="re-input"
                    placeholder="1"
                    min={0}
                    max={10}
                    step={0.25}
                    value={form.maintenancePercent}
                    onChange={e => setField('maintenancePercent', e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </fieldset>

          {error && <div className="banner banner--error">{error}</div>}
        </div>

        {/* ─── Loan Summary Panel ─── */}
        <LoanSummaryPanel result={result} loading={analyzing} />
      </div>

    </div>
  );
}
