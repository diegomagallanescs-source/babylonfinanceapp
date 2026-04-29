import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend, ReferenceLine,
} from 'recharts';

import { useInvestments }             from '../../hooks/useInvestments';
import { useCreateInvestment }        from '../../hooks/useCreateInvestment';
import { useUpdateInvestment }        from '../../hooks/useUpdateInvestment';
import { useDeleteInvestment }        from '../../hooks/useDeleteInvestment';
import { useInvestmentIncomeAll }     from '../../hooks/useInvestmentIncomeAll';
import { useCreateInvestmentIncome }  from '../../hooks/useCreateInvestmentIncome';
import { formatCurrency }             from '../../utils/format';
import type { CreateInvestmentRequest, UpdateInvestmentRequest } from '../../types';
import type { CreateInvestmentIncomeRequest, InvestmentIncomeResponseDto } from '../../types';
import './InvestingPage.css';

// ── Constants ─────────────────────────────────────────────────

const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR_OPTIONS = Array.from({ length: 31 }, (_, i) => 2020 + i);

const INVESTMENT_TYPES: { value: string; label: string }[] = [
  { value: 'Retirement401k', label: '401(k)' },
  { value: 'RothIRA',        label: 'Roth IRA' },
  { value: 'Brokerage',      label: 'Brokerage' },
  { value: 'Crypto',         label: 'Crypto' },
  { value: 'RealEstate',     label: 'Property' },
  { value: 'Other',          label: 'Other' },
];

const INCOME_TYPES = ['Dividend','Interest','Rental','Royalty','Other'];

// Up to 6 distinct category colors
const CAT_COLORS = ['#F0B429','#00E676','#00E5CC','#6B8CFF','#FF9A3C','#C084FC'];

const PORTFOLIO_ENTRIES_KEY = 'babylon-portfolio-entries';

// ── Types ─────────────────────────────────────────────────────

interface PortfolioEntry {
  id:       string;
  month:    number;
  year:     number;
  category: string;
  amount:   number;
}

// ── localStorage helpers ──────────────────────────────────────

function loadPortfolioEntries(): PortfolioEntry[] {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_ENTRIES_KEY) ?? '[]'); }
  catch { return []; }
}

function savePortfolioEntries(entries: PortfolioEntry[]): void {
  localStorage.setItem(PORTFOLIO_ENTRIES_KEY, JSON.stringify(entries));
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Chart data builders ───────────────────────────────────────

function buildStackedPortfolio(entries: PortfolioEntry[]) {
  const monthKeys = [...new Set(
    entries.map(e => `${e.year}-${String(e.month).padStart(2,'0')}`)
  )].sort();

  const categories = [...new Set(entries.map(e => e.category))].slice(0, 6);

  const data = monthKeys.map(key => {
    const [y, m] = key.split('-').map(Number);
    const row: Record<string, any> = {
      label: `${MONTH_SHORT[m - 1]} '${String(y).slice(2)}`,
    };
    categories.forEach(cat => {
      const match = entries.find(e => e.year === y && e.month === m && e.category === cat);
      row[cat] = match?.amount ?? 0;
    });
    return row;
  });

  return { data, categories };
}

function buildStackedPassive(records: InvestmentIncomeResponseDto[]) {
  const monthKeys = [...new Set(records.map(r => {
    const d = new Date(r.receivedDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  }))].sort();

  const categories = [...new Set(records.map(r => r.sourceName))].slice(0, 6);

  const data = monthKeys.map(key => {
    const [y, m] = key.split('-').map(Number);
    const row: Record<string, any> = {
      label: `${MONTH_SHORT[m - 1]} '${String(y).slice(2)}`,
    };
    categories.forEach(cat => {
      const total = records
        .filter(r => {
          const d = new Date(r.receivedDate);
          return d.getFullYear() === y && d.getMonth() + 1 === m && r.sourceName === cat;
        })
        .reduce((s, r) => s + r.amount, 0);
      row[cat] = total;
    });
    return row;
  });

  return { data, categories };
}

// ── Compound growth ───────────────────────────────────────────

function projectGrowth(monthly: number, annualRate: number, years: number, startingValue: number) {
  const r = annualRate / 100 / 12;
  let value = startingValue;
  let contributed = 0;
  const data: { label: string; totalValue: number; contributed: number }[] = [];
  data.push({ label: 'Today', totalValue: Math.round(value), contributed: Math.round(startingValue) });
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) {
      data.push({
        label: `Yr ${m / 12}`,
        totalValue: Math.round(value),
        contributed: Math.round(startingValue + contributed),
      });
    }
  }
  return data;
}

// ── Custom tooltips ───────────────────────────────────────────

function StackedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="inv-tooltip">
      <div className="inv-tooltip__label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="inv-tooltip__row">
          <span className="inv-tooltip__dot" style={{ background: p.fill }} />
          <span>{p.dataKey}:</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="inv-tooltip__total">Total: {formatCurrency(total)}</div>
      )}
    </div>
  );
}

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="inv-tooltip">
      <div className="inv-tooltip__label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="inv-tooltip__row">
          <span className="inv-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── InvestingPage ─────────────────────────────────────────────

export function InvestingPage() {
  // ── Server data
  const { data: investments = [], isLoading: invLoading }    = useInvestments();
  const { data: incomeAll   = [], isLoading: passiveLoading }= useInvestmentIncomeAll();

  // ── Mutations
  const createInv    = useCreateInvestment();
  const updateInv    = useUpdateInvestment();
  const deleteInv    = useDeleteInvestment();
  const createIncome = useCreateInvestmentIncome();

  // ── Portfolio total
  const totalPortfolio = useMemo(
    () => investments.reduce((s, inv) => s + inv.currentValue, 0),
    [investments],
  );

  // ─────────────────────────────────────────────────────────────
  // Section 1 — Portfolio CRUD state
  // ─────────────────────────────────────────────────────────────
  const [showAddInv, setShowAddInv]   = useState(false);
  const [editingId,  setEditingId]    = useState<string | null>(null);
  const [invForm, setInvForm]         = useState<CreateInvestmentRequest>({
    customLabel: '', investmentType: 'Retirement401k', currentValue: 0, ticker: '',
  });
  const [invError, setInvError]       = useState<string | null>(null);

  const resetInvForm = () => {
    setInvForm({ customLabel: '', investmentType: 'Retirement401k', currentValue: 0, ticker: '' });
    setInvError(null);
  };

  const handleAddInv = async () => {
    setInvError(null);
    if (!invForm.customLabel.trim()) { setInvError('Account name is required.'); return; }
    if (invForm.currentValue < 0)    { setInvError('Value must be 0 or greater.'); return; }
    try {
      await createInv.mutateAsync({ ...invForm, ticker: invForm.ticker || null });
      resetInvForm();
      setShowAddInv(false);
    } catch {
      setInvError('Failed to save. Please try again.');
    }
  };

  // Edit — seed form from existing row
  const startEdit = (id: string) => {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;
    setInvForm({
      customLabel:    inv.customLabel,
      investmentType: inv.investmentType,
      currentValue:   inv.currentValue,
      ticker:         inv.ticker ?? '',
    });
    setEditingId(id);
    setInvError(null);
  };

  const handleUpdateInv = async () => {
    if (!editingId) return;
    setInvError(null);
    if (!invForm.customLabel.trim()) { setInvError('Account name is required.'); return; }
    try {
      const body: UpdateInvestmentRequest = {
        customLabel:    invForm.customLabel,
        investmentType: invForm.investmentType,
        currentValue:   invForm.currentValue,
        ticker:         invForm.ticker || null,
      };
      await updateInv.mutateAsync({ id: editingId, body });
      setEditingId(null);
      resetInvForm();
    } catch {
      setInvError('Failed to update. Please try again.');
    }
  };

  const handleDeleteInv = async (id: string) => {
    if (!window.confirm('Remove this investment entry?')) return;
    await deleteInv.mutateAsync(id);
  };

  const typeLabel = useCallback((type: string) => {
    return INVESTMENT_TYPES.find(t => t.value === type)?.label ?? type;
  }, []);

  const typeColor = useCallback((type: string) => {
    const map: Record<string, string> = {
      Retirement401k: 'var(--color-gold)',
      RothIRA:        'var(--color-river)',
      Brokerage:      'var(--color-positive)',
      Crypto:         '#C084FC',
      RealEstate:     '#FF9A3C',
      Other:          'var(--color-text-muted)',
    };
    return map[type] ?? 'var(--color-text-muted)';
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Section 2 — Portfolio Over Time (localStorage)
  // ─────────────────────────────────────────────────────────────
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>(loadPortfolioEntries);

  const now = new Date();
  const [showPortEntry, setShowPortEntry]   = useState(false);
  const [portMonth, setPortMonth]           = useState(now.getMonth() + 1);
  const [portYear, setPortYear]             = useState(now.getFullYear());
  const [portCategory, setPortCategory]     = useState('');
  const [portAmount, setPortAmount]         = useState('');
  const [portError, setPortError]           = useState<string | null>(null);

  const portfolioChart = useMemo(() => buildStackedPortfolio(portfolioEntries), [portfolioEntries]);

  const handleAddPortEntry = () => {
    setPortError(null);
    if (!portCategory.trim()) { setPortError('Category name is required.'); return; }
    const amount = parseFloat(portAmount);
    if (isNaN(amount) || amount <= 0) { setPortError('Enter a valid amount.'); return; }
    const cats = [...new Set(portfolioEntries.map(e => e.category))];
    if (!cats.includes(portCategory) && cats.length >= 6) {
      setPortError('Maximum 6 categories reached.'); return;
    }
    const next: PortfolioEntry[] = [
      ...portfolioEntries,
      { id: genId(), month: portMonth, year: portYear, category: portCategory.trim(), amount },
    ];
    setPortfolioEntries(next);
    savePortfolioEntries(next);
    setPortCategory('');
    setPortAmount('');
    setShowPortEntry(false);
  };

  const handleDeletePortEntry = (id: string) => {
    const next = portfolioEntries.filter(e => e.id !== id);
    setPortfolioEntries(next);
    savePortfolioEntries(next);
  };

  // ─────────────────────────────────────────────────────────────
  // Section 2 — Passive Income Over Time (DB)
  // ─────────────────────────────────────────────────────────────
  const [showPassiveEntry, setShowPassiveEntry] = useState(false);
  const [passiveMonth, setPassiveMonth]         = useState(now.getMonth() + 1);
  const [passiveYear, setPassiveYear]           = useState(now.getFullYear());
  const [passiveSource, setPassiveSource]       = useState('');
  const [passiveType, setPassiveType]           = useState('Dividend');
  const [passiveAmount, setPassiveAmount]       = useState('');
  const [passiveError, setPassiveError]         = useState<string | null>(null);

  const passiveChart = useMemo(() => buildStackedPassive(incomeAll), [incomeAll]);

  const handleAddPassiveEntry = async () => {
    setPassiveError(null);
    if (!passiveSource.trim()) { setPassiveError('Source / category name is required.'); return; }
    const amount = parseFloat(passiveAmount);
    if (isNaN(amount) || amount <= 0) { setPassiveError('Enter a valid amount.'); return; }
    const existingCats = [...new Set(incomeAll.map(r => r.sourceName))];
    if (!existingCats.includes(passiveSource.trim()) && existingCats.length >= 6) {
      setPassiveError('Maximum 6 categories reached.'); return;
    }
    const payload: CreateInvestmentIncomeRequest = {
      sourceName:   passiveSource.trim(),
      type:         passiveType,
      amount,
      receivedDate: new Date(passiveYear, passiveMonth - 1, 1).toISOString(),
    };
    try {
      await createIncome.mutateAsync(payload);
      setPassiveSource('');
      setPassiveAmount('');
      setPassiveType('Dividend');
      setShowPassiveEntry(false);
    } catch {
      setPassiveError('Failed to save. Please try again.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Section 3 — Compound Growth Projector
  // ─────────────────────────────────────────────────────────────
  const [projMonthly, setProjMonthly]   = useState(500);
  const [projRate,    setProjRate]      = useState(7);
  const [projYears,   setProjYears]     = useState(30);
  const [projData,    setProjData]      = useState<ReturnType<typeof projectGrowth> | null>(null);

  const handleSeeProjection = () => {
    setProjData(projectGrowth(projMonthly, projRate, projYears, totalPortfolio));
  };

  const finalProj = projData ? projData[projData.length - 1] : null;

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">

      {/* ══ Section 1: Portfolio Summary ══════════════════════ */}
      <section className="inv-section">
        <div className="inv-portfolio-header">
          <div>
            <div className="inv-portfolio-header__eyebrow">Total Portfolio Value</div>
            <div className="inv-portfolio-header__total">
              {invLoading ? '—' : formatCurrency(totalPortfolio)}
            </div>
          </div>
          <button
            className="inv-btn inv-btn--primary"
            onClick={() => { setShowAddInv(v => !v); setEditingId(null); resetInvForm(); }}
          >
            {showAddInv ? 'Cancel' : '+ Add Account'}
          </button>
        </div>

        {/* Add form */}
        {showAddInv && (
          <div className="inv-crud-form">
            <div className="inv-crud-form__row">
              <div className="inv-crud-form__field inv-crud-form__field--grow">
                <label>Account / Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fidelity 401k, Primary Home Equity"
                  value={invForm.customLabel}
                  onChange={e => setInvForm(f => ({ ...f, customLabel: e.target.value }))}
                />
              </div>
              <div className="inv-crud-form__field">
                <label>Type</label>
                <select
                  value={invForm.investmentType}
                  onChange={e => setInvForm(f => ({ ...f, investmentType: e.target.value }))}
                >
                  {INVESTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="inv-crud-form__field">
                <label>Current Value ($)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0.00"
                  value={invForm.currentValue || ''}
                  onChange={e => setInvForm(f => ({ ...f, currentValue: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="inv-crud-form__field">
                <label>Ticker (optional)</label>
                <input
                  type="text"
                  placeholder="VTI"
                  value={invForm.ticker ?? ''}
                  onChange={e => setInvForm(f => ({ ...f, ticker: e.target.value }))}
                />
              </div>
            </div>
            {invError && <div className="inv-form-error">{invError}</div>}
            <div className="inv-crud-form__actions">
              <button className="inv-btn inv-btn--ghost" onClick={() => { setShowAddInv(false); resetInvForm(); }}>
                Cancel
              </button>
              <button
                className="inv-btn inv-btn--primary"
                onClick={handleAddInv}
                disabled={createInv.isPending}
              >
                {createInv.isPending ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </div>
        )}

        {/* Investments list */}
        {invLoading ? (
          <div className="inv-skeleton-row" />
        ) : investments.length === 0 ? (
          <div className="inv-empty">
            No investments yet — click "+ Add Account" to add your first entry.
          </div>
        ) : (
          <div className="inv-list">
            {/* Header */}
            <div className="inv-list__head">
              <span>Account</span>
              <span>Type</span>
              <span>Current Value</span>
              <span />
            </div>

            {investments.map(inv => (
              editingId === inv.id ? (
                /* ── Edit row ── */
                <div key={inv.id} className="inv-list__edit-row">
                  <div className="inv-crud-form">
                    <div className="inv-crud-form__row">
                      <div className="inv-crud-form__field inv-crud-form__field--grow">
                        <label>Account Name</label>
                        <input
                          type="text"
                          value={invForm.customLabel}
                          onChange={e => setInvForm(f => ({ ...f, customLabel: e.target.value }))}
                        />
                      </div>
                      <div className="inv-crud-form__field">
                        <label>Type</label>
                        <select
                          value={invForm.investmentType}
                          onChange={e => setInvForm(f => ({ ...f, investmentType: e.target.value }))}
                        >
                          {INVESTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="inv-crud-form__field">
                        <label>Current Value ($)</label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={invForm.currentValue || ''}
                          onChange={e => setInvForm(f => ({ ...f, currentValue: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="inv-crud-form__field">
                        <label>Ticker</label>
                        <input
                          type="text"
                          value={invForm.ticker ?? ''}
                          onChange={e => setInvForm(f => ({ ...f, ticker: e.target.value }))}
                        />
                      </div>
                    </div>
                    {invError && <div className="inv-form-error">{invError}</div>}
                    <div className="inv-crud-form__actions">
                      <button className="inv-btn inv-btn--ghost" onClick={() => { setEditingId(null); resetInvForm(); }}>
                        Cancel
                      </button>
                      <button
                        className="inv-btn inv-btn--primary"
                        onClick={handleUpdateInv}
                        disabled={updateInv.isPending}
                      >
                        {updateInv.isPending ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Display row ── */
                <div key={inv.id} className="inv-list__row">
                  <span className="inv-list__label">
                    {inv.bankLogoUrl && (
                      <img src={inv.bankLogoUrl} alt="" className="inv-list__logo" />
                    )}
                    <span>{inv.customLabel}</span>
                    {inv.ticker && <span className="inv-list__ticker">{inv.ticker}</span>}
                  </span>
                  <span
                    className="inv-list__type"
                    style={{ color: typeColor(inv.investmentType) }}
                  >
                    {typeLabel(inv.investmentType)}
                  </span>
                  <span className="inv-list__value">{formatCurrency(inv.currentValue)}</span>
                  <span className="inv-list__actions">
                    <button className="inv-icon-btn" title="Edit" onClick={() => startEdit(inv.id)}>✏</button>
                    <button
                      className="inv-icon-btn inv-icon-btn--danger"
                      title="Delete"
                      onClick={() => handleDeleteInv(inv.id)}
                      disabled={deleteInv.isPending}
                    >
                      ×
                    </button>
                  </span>
                </div>
              )
            ))}

            {/* Total row */}
            <div className="inv-list__total-row">
              <span>Total</span>
              <span />
              <span>{formatCurrency(totalPortfolio)}</span>
              <span />
            </div>
          </div>
        )}
      </section>

      {/* ══ Section 2: Side-by-side charts ════════════════════ */}
      <section className="inv-section inv-section--charts">
        <div className="inv-charts-row">

          {/* ── Left: Portfolio Over Time ── */}
          <div className="inv-chart-card">
            <div className="inv-chart-card__header">
              <div>
                <h3 className="inv-chart-card__title">Portfolio Over Time</h3>
                <span className="inv-chart-card__sub">Monthly value by category</span>
              </div>
              <button
                className="inv-btn inv-btn--secondary inv-btn--sm"
                onClick={() => setShowPortEntry(v => !v)}
              >
                {showPortEntry ? 'Cancel' : '+ Add Entry'}
              </button>
            </div>

            {/* Add entry form */}
            {showPortEntry && (
              <div className="inv-entry-form">
                <div className="inv-entry-form__row">
                  <div className="inv-entry-form__field">
                    <label>Month</label>
                    <select value={portMonth} onChange={e => setPortMonth(+e.target.value)}>
                      {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="inv-entry-form__field">
                    <label>Year</label>
                    <select value={portYear} onChange={e => setPortYear(+e.target.value)}>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="inv-entry-form__field inv-entry-form__field--grow">
                    <label>Category</label>
                    <input
                      type="text"
                      placeholder="e.g. 401k, Brokerage, Crypto"
                      value={portCategory}
                      onChange={e => setPortCategory(e.target.value)}
                    />
                  </div>
                  <div className="inv-entry-form__field">
                    <label>Amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={portAmount}
                      onChange={e => setPortAmount(e.target.value)}
                    />
                  </div>
                </div>
                {portError && <div className="inv-form-error">{portError}</div>}
                <button className="inv-btn inv-btn--primary inv-btn--sm" onClick={handleAddPortEntry}>
                  Save Entry
                </button>
              </div>
            )}

            {/* Category legend */}
            {portfolioChart.categories.length > 0 && (
              <div className="inv-cat-legend">
                {portfolioChart.categories.map((cat, i) => (
                  <span key={cat} className="inv-cat-legend__item">
                    <span className="inv-cat-legend__dot" style={{ background: CAT_COLORS[i] }} />
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {portfolioChart.data.length === 0 ? (
              <div className="inv-chart-empty">
                No entries yet — click "+ Add Entry" to record your portfolio value for a month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={portfolioChart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false} width={56}
                    tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                  />
                  <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  {portfolioChart.categories.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[i]} radius={i === portfolioChart.categories.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Entry management — delete individual entries */}
            {portfolioEntries.length > 0 && (
              <details className="inv-entry-list">
                <summary className="inv-entry-list__toggle">Manage entries ({portfolioEntries.length})</summary>
                <div className="inv-entry-list__rows">
                  {[...portfolioEntries].reverse().map(e => (
                    <div key={e.id} className="inv-entry-list__row">
                      <span className="inv-entry-list__period">{MONTH_SHORT[e.month - 1]} {e.year}</span>
                      <span className="inv-entry-list__cat">{e.category}</span>
                      <span className="inv-entry-list__amt">{formatCurrency(e.amount)}</span>
                      <button className="inv-icon-btn inv-icon-btn--danger" onClick={() => handleDeletePortEntry(e.id)}>×</button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* ── Right: Passive Income Over Time ── */}
          <div className="inv-chart-card">
            <div className="inv-chart-card__header">
              <div>
                <h3 className="inv-chart-card__title">Passive Income Over Time</h3>
                <span className="inv-chart-card__sub">Monthly dividends, interest &amp; distributions</span>
              </div>
              <button
                className="inv-btn inv-btn--secondary inv-btn--sm"
                onClick={() => setShowPassiveEntry(v => !v)}
              >
                {showPassiveEntry ? 'Cancel' : '+ Add Entry'}
              </button>
            </div>

            {/* Add entry form */}
            {showPassiveEntry && (
              <div className="inv-entry-form">
                <div className="inv-entry-form__row">
                  <div className="inv-entry-form__field">
                    <label>Month</label>
                    <select value={passiveMonth} onChange={e => setPassiveMonth(+e.target.value)}>
                      {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="inv-entry-form__field">
                    <label>Year</label>
                    <select value={passiveYear} onChange={e => setPassiveYear(+e.target.value)}>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="inv-entry-form__field inv-entry-form__field--grow">
                    <label>Source / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. SCHD Dividend, Bond Interest"
                      value={passiveSource}
                      onChange={e => setPassiveSource(e.target.value)}
                    />
                  </div>
                  <div className="inv-entry-form__field">
                    <label>Type</label>
                    <select value={passiveType} onChange={e => setPassiveType(e.target.value)}>
                      {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="inv-entry-form__field">
                    <label>Amount ($)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={passiveAmount}
                      onChange={e => setPassiveAmount(e.target.value)}
                    />
                  </div>
                </div>
                {passiveError && <div className="inv-form-error">{passiveError}</div>}
                <button
                  className="inv-btn inv-btn--primary inv-btn--sm"
                  onClick={handleAddPassiveEntry}
                  disabled={createIncome.isPending}
                >
                  {createIncome.isPending ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            )}

            {/* Category legend */}
            {passiveChart.categories.length > 0 && (
              <div className="inv-cat-legend">
                {passiveChart.categories.map((cat, i) => (
                  <span key={cat} className="inv-cat-legend__item">
                    <span className="inv-cat-legend__dot" style={{ background: CAT_COLORS[i] }} />
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {passiveLoading ? (
              <div className="inv-chart-skeleton" />
            ) : passiveChart.data.length === 0 ? (
              <div className="inv-chart-empty">
                No entries yet — click "+ Add Entry" to log your first passive income.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={passiveChart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false} width={52}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  {passiveChart.categories.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="b" fill={CAT_COLORS[i]} radius={i === passiveChart.categories.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      </section>

      {/* ══ Section 3: Compound Growth Projector ══════════════ */}
      <section className="inv-section">
        <div className="inv-section-header">
          <h2 className="inv-section-title">Compound Growth Projector</h2>
          <span className="inv-section-sub">Projects forward from your current portfolio value</span>
        </div>

        <div className="inv-projector">
          <div className="inv-projector__controls">
            {/* Starting value — read-only */}
            <div className="inv-projector__control">
              <label>Starting Value</label>
              <div className="inv-projector__input-wrap inv-projector__input-wrap--readonly">
                <span>$</span>
                <input
                  type="text"
                  readOnly
                  value={totalPortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
              </div>
              <span className="inv-projector__hint">From your portfolio above</span>
            </div>

            {/* Monthly contribution */}
            <div className="inv-projector__control">
              <label>Monthly Contribution</label>
              <div className="inv-projector__input-wrap">
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={projMonthly}
                  onChange={e => setProjMonthly(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Annual return */}
            <div className="inv-projector__control">
              <label>Expected Annual Return</label>
              <div className="inv-projector__input-wrap">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={projRate}
                  onChange={e => setProjRate(parseFloat(e.target.value) || 0)}
                />
                <span>%</span>
              </div>
            </div>

            {/* Time horizon */}
            <div className="inv-projector__control">
              <label>Time Horizon</label>
              <div className="inv-projector__input-wrap">
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={projYears}
                  onChange={e => setProjYears(parseInt(e.target.value, 10) || 1)}
                />
                <span>years</span>
              </div>
            </div>
          </div>

          <button className="inv-btn inv-btn--primary inv-projector__cta" onClick={handleSeeProjection}>
            See Projection →
          </button>

          {/* Chart — only renders after button click */}
          {projData && (
            <>
              <div className="inv-projector__chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={projData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      interval={Math.max(1, Math.floor(projData.length / 7))}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false} tickLine={false} width={64}
                      tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1_000).toFixed(0)}k`}
                    />
                    <Tooltip content={<LineTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }} />
                    <ReferenceLine
                      x="Today"
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4 2"
                    />
                    <Line
                      type="monotone"
                      dataKey="totalValue"
                      name="Total w/ Growth"
                      stroke="var(--color-gold)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: 'var(--color-gold)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="contributed"
                      name="Contributions Only"
                      stroke="var(--color-text-muted)"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--color-text-muted)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {finalProj && (
                <div className="inv-projector__summary">
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">
                      In {projYears} year{projYears !== 1 ? 's' : ''}
                    </span>
                    <span className="inv-projector__summary-value inv-projector__summary-value--gold">
                      {formatCurrency(finalProj.totalValue)}
                    </span>
                  </div>
                  <div className="inv-projector__summary-divider" />
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">Contributions total</span>
                    <span className="inv-projector__summary-value">
                      {formatCurrency(finalProj.contributed)}
                    </span>
                  </div>
                  <div className="inv-projector__summary-divider" />
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">Compound growth</span>
                    <span className="inv-projector__summary-value inv-projector__summary-value--positive">
                      {formatCurrency(finalProj.totalValue - finalProj.contributed)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

    </div>
  );
}
