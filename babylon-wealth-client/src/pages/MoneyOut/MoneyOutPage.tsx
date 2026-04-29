import { useState, useCallback } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell, LabelList, Legend,
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';

import { UploadFlowPanel } from '../../components/UploadFlowPanel';
import { CumulativeTransactionView } from '../../components/CumulativeTransactionView';
import { useStatementHistory } from '../../hooks/useStatementHistory';
import { useSaveStatement } from '../../hooks/useSaveStatement';
import { useUpdateStatement } from '../../hooks/useUpdateStatement';
import { useStatementAnnualSummary } from '../../hooks/useStatementAnnualSummary';
import { formatCurrency } from '../../utils/format';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import type {
  StatementAnalysisResponseDto,
  StatementSummaryResponseDto,
  AnnualFinancialSummaryDto,
  CategoryBreakdownDto,
  TopMerchantDto,
  ParsedTransactionDto,
  MonthlySpendDto,
  SelectedPeriod,
  SaveStatementRequest,
} from '../../types/statements';
import './MoneyOutPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── SpendSummaryCard ──────────────────────────────────────────

function SpendSummaryCard({
  result,
  period,
}: {
  result: StatementAnalysisResponseDto;
  period: SelectedPeriod;
}) {
  return (
    <div className="mo-summary-card">
      <div className="mo-summary-card__left">
        <div className="mo-summary-card__label">Total Spend</div>
        <div className="mo-summary-card__amount">
          {formatCurrency(result.totalPurchases)}
        </div>
        <div className="mo-summary-card__meta">
          {period.label}
          &nbsp;·&nbsp;
          {result.transactionCount} transactions
          {result.accountsDetected.length > 0 && (
            <>&nbsp;·&nbsp;Accounts: {result.accountsDetected.join(', ')}</>
          )}
        </div>
      </div>
      <div className="mo-summary-card__right">
        <span className={`mo-badge mo-badge--${result.reportType === 'YearEnd' ? 'year' : 'month'}`}>
          {result.reportType === 'YearEnd' ? 'Year-End' : 'Monthly'}
        </span>
      </div>
    </div>
  );
}

// ── CategoryBarChart ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: CategoryBreakdownDto = payload[0].payload;
  return (
    <div className="mo-tooltip">
      <div className="mo-tooltip__name">{d.category}</div>
      <div className="mo-tooltip__row"><span>Total</span><span>{formatCurrency(d.total)}</span></div>
      <div className="mo-tooltip__row"><span>Transactions</span><span>{d.count}</span></div>
      <div className="mo-tooltip__row"><span>Share</span><span>{d.percentage.toFixed(1)}%</span></div>
    </div>
  );
}

function CategoryBarChart({ breakdown }: { breakdown: CategoryBreakdownDto[] }) {
  const sorted = [...breakdown].sort((a, b) => b.total - a.total);
  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Spending by Category</div>
      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 38)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }} barCategoryGap="20%">
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="category" width={140} tick={{ fill: 'var(--color-text-sub)', fontSize: 13 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {sorted.map((_, i) => <Cell key={i} fill="var(--color-negative)" fillOpacity={1 - i * 0.06} />)}
            <LabelList dataKey="percentage" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fill: 'var(--color-text-sub)', fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MerchantModal ─────────────────────────────────────────────

function MerchantModal({
  merchant,
  transactions,
  onClose,
}: {
  merchant: TopMerchantDto;
  transactions: ParsedTransactionDto[];
  onClose: () => void;
}) {
  const rows = transactions
    .filter(t => t.merchant === merchant.name)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mo-merchant-overlay" onClick={onClose}>
      <div className="mo-merchant-modal" onClick={e => e.stopPropagation()}>
        <div className="mo-merchant-modal__header">
          <div className="mo-merchant-modal__title">{merchant.name}</div>
          <div className="mo-merchant-modal__meta">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''}
            &nbsp;·&nbsp;
            <span style={{ color: 'var(--color-negative)' }}>{formatCurrency(merchant.total)}</span>
          </div>
          <button className="mo-merchant-modal__close" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="mo-merchant-modal__body">
          <table className="mo-merchant-txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="mo-merchant-txn-table__num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i}>
                  <td className="mo-merchant-txn-table__date">{t.date}</td>
                  <td>{t.description}</td>
                  <td className="mo-merchant-txn-table__num mo-merchant-txn-table__amount">
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── TopMerchantsTable ─────────────────────────────────────────

function TopMerchantsTable({
  merchants,
  transactions,
}: {
  merchants: TopMerchantDto[];
  transactions: ParsedTransactionDto[];
}) {
  const [selected, setSelected] = useState<TopMerchantDto | null>(null);

  return (
    <>
      <div className="mo-chart-card">
        <div className="mo-chart-card__title">Top Merchants</div>
        <table className="mo-merchants-table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th className="mo-merchants-table__num">Total</th>
              <th className="mo-merchants-table__num">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m, i) => (
              <tr key={i} className="mo-merchants-table__row--clickable" onClick={() => setSelected(m)}>
                <td>{m.name}</td>
                <td className="mo-merchants-table__num">{formatCurrency(m.total)}</td>
                <td className="mo-merchants-table__num mo-merchants-table__count">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <MerchantModal
          merchant={selected}
          transactions={transactions}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ── MonthlyBreakdownBarChart ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mo-tooltip">
      <div className="mo-tooltip__name">{label}</div>
      <div className="mo-tooltip__row"><span>Spend</span><span>{formatCurrency(payload[0].value)}</span></div>
      <div className="mo-tooltip__row"><span>Transactions</span><span>{payload[0].payload.count}</span></div>
    </div>
  );
}

function MonthlyBreakdownBarChart({ breakdown }: { breakdown: MonthlySpendDto[] }) {
  const sorted = [...breakdown].sort((a, b) => a.month - b.month);
  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Monthly Breakdown</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={sorted} margin={{ top: 16, right: 16, left: 8, bottom: 4 }} barCategoryGap="28%">
          <XAxis dataKey="monthName" tick={{ fill: 'var(--color-text-sub)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
          <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="total" fill="var(--color-negative)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── SpendHistoryChart ─────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  necessities:  '#E05555',
  travel:       '#6B8CFF',
  savings:      '#4CAF7D',
  shopping:     '#F0B429',
  investments:  '#C084FC',
  other:        '#8A8070',
  total:        '#FF4458',
};

function historyLabel(r: StatementSummaryResponseDto): string {
  return `${MONTH_SHORT[r.month - 1]} '${String(r.year).slice(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpendHistoryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const hasCats = payload.some((p: any) => p.dataKey !== 'total' && p.value > 0);
  return (
    <div className="mo-tooltip">
      <div className="mo-tooltip__name">{label}</div>
      {hasCats
        ? payload
            .filter((p: any) => p.value > 0)
            .map((p: any) => (
              <div key={p.dataKey} className="mo-tooltip__row">
                <span style={{ color: p.fill }}>{p.name}</span>
                <span>{formatCurrency(p.value)}</span>
              </div>
            ))
        : <div className="mo-tooltip__row"><span>Total Spend</span><span>{formatCurrency(payload[0].value)}</span></div>
      }
    </div>
  );
}

function SpendHistoryChart({ history }: { history: StatementSummaryResponseDto[] }) {
  const sorted = [...history].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  const hasCategoryData = sorted.some(r => r.necessitiesSpend != null);

  const data = sorted.map(r => ({
    label: historyLabel(r),
    total: r.totalSpend,
    necessities:  r.necessitiesSpend ?? 0,
    travel:       r.travelSpend ?? 0,
    savings:      r.savingsSpend ?? 0,
    shopping:     r.shoppingSpend ?? 0,
    investments:  r.investmentsSpend ?? 0,
    other:        r.otherSpend ?? 0,
    hasCats:      r.necessitiesSpend != null,
  }));

  if (data.length === 0) {
    return (
      <div className="mo-chart-card">
        <div className="mo-chart-card__title">Spend History</div>
        <div className="mo-empty-state">
          <span>📄</span>
          <p>No statements saved yet. Upload a PDF above and click Save to start tracking.</p>
        </div>
      </div>
    );
  }

  if (!hasCategoryData) {
    return (
      <div className="mo-chart-card">
        <div className="mo-chart-card__title">Spend History</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF4458" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F0B429" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
            <Tooltip content={<SpendHistoryTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="total" stroke="#FF4458" strokeWidth={2} fill="url(#spendGrad)" dot={false} activeDot={{ r: 4, fill: '#FF4458' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Spend History by Category</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
          <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
          <Tooltip content={<SpendHistoryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => <span style={{ color: 'var(--color-text-sub)' }}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>}
          />
          {(['necessities', 'travel', 'savings', 'shopping', 'investments', 'other'] as const).map((cat, i) => (
            <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CAT_COLORS[cat]}
              fillOpacity={0.9} radius={i === 5 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── AnnualSummaryTable ────────────────────────────────────────

function AnnualSummaryTable({ data }: { data: AnnualFinancialSummaryDto[] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <div className="mo-chart-card mo-history-empty">
        <div className="mo-chart-card__title">Annual Summary</div>
        <div className="mo-empty-state">
          <span>📊</span>
          <p>Save statements from multiple months to see yearly totals.</p>
        </div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.year - a.year);

  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Annual Summary</div>
      <table className="mo-annual-table">
        <thead>
          <tr>
            <th>Year</th>
            <th className="mo-annual-table__num">CC Spend</th>
            <th className="mo-annual-table__num">Money In</th>
            <th className="mo-annual-table__num">Net Savings</th>
            <th className="mo-annual-table__num">CC Months</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.year}>
              <td className="mo-annual-table__year">{row.year}</td>
              <td className="mo-annual-table__num">{formatCurrency(row.totalCreditCardSpend, true)}</td>
              <td className="mo-annual-table__num mo-annual-table__in">
                {formatCurrency(row.totalMoneyIn, true)}
              </td>
              <td className={`mo-annual-table__num ${row.netSavings >= 0 ? 'mo-annual-table__pos' : 'mo-annual-table__neg'}`}>
                {row.netSavings >= 0 ? '+' : ''}{formatCurrency(row.netSavings, true)}
              </td>
              <td className="mo-annual-table__num mo-annual-table__months">
                {row.creditCardMonthsRecorded}/12
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── SavePeriodButton ──────────────────────────────────────────

interface SavePeriodButtonProps {
  period: SelectedPeriod;
  result: StatementAnalysisResponseDto;
  existingRecord: StatementSummaryResponseDto | undefined;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}

function SavePeriodButton({
  period,
  result,
  existingRecord,
  onSaved,
  onError,
}: SavePeriodButtonProps) {
  const [progress, setProgress] = useState<string | null>(null);
  const [cats, setCats] = useState({ necessities: '', travel: '', savings: '', shopping: '', investments: '', other: '' });
  const saveMutation = useSaveStatement();
  const updateMutation = useUpdateStatement();
  const queryClient = useQueryClient();

  const busy = saveMutation.isPending || updateMutation.isPending || progress !== null;

  const label = progress
    ?? (period.mode === 'year-end'
      ? `Save All ${result.monthlyBreakdown.length} Months →`
      : existingRecord
        ? `Update ${period.label} →`
        : `Save ${period.label} →`);

  function parseOptional(val: string): number | null {
    const n = parseFloat(val);
    return val.trim() === '' || isNaN(n) ? null : n;
  }

  const handleMonthlySave = async () => {
    const payload: SaveStatementRequest = {
      month: period.month!,
      year: period.year,
      totalSpend: result.totalPurchases,
      transactionCount: result.transactionCount,
      accountsIncluded: result.accountsDetected.join(', '),
      necessitiesSpend:  parseOptional(cats.necessities),
      travelSpend:       parseOptional(cats.travel),
      savingsSpend:      parseOptional(cats.savings),
      shoppingSpend:     parseOptional(cats.shopping),
      investmentsSpend:  parseOptional(cats.investments),
      otherSpend:        parseOptional(cats.other),
    };

    if (existingRecord) {
      const ok = window.confirm(
        `${period.label} is already saved. Overwrite with the new numbers?`,
      );
      if (!ok) return;
      await updateMutation.mutateAsync({ id: existingRecord.id, ...payload });
      onSaved(`${period.label} updated ✓`);
    } else {
      await saveMutation.mutateAsync(payload);
      onSaved(`${period.label} saved ✓`);
    }
  };

  const handleYearEndSave = async () => {
    const months = result.monthlyBreakdown;
    try {
      for (let i = 0; i < months.length; i++) {
        setProgress(`Saving ${i + 1} of ${months.length}…`);
        await saveMutation.mutateAsync({
          month: months[i].month,
          year: period.year,
          totalSpend: months[i].total,
          transactionCount: months[i].count,
          accountsIncluded: result.accountsDetected.join(', '),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
      onSaved(`${months.length} months saved for ${period.year} ✓`);
    } catch {
      onError('Some months failed to save. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  const handleClick = async () => {
    try {
      if (period.mode === 'year-end') {
        await handleYearEndSave();
      } else {
        await handleMonthlySave();
      }
    } catch {
      onError('Save failed. Please try again.');
    }
  };

  function filledTotal() {
    return ['necessities', 'travel', 'savings', 'shopping', 'investments']
      .reduce((sum, k) => sum + (parseOptional(cats[k as keyof typeof cats]) ?? 0), 0);
  }

  function handleFillRest() {
    const remainder = Math.max(0, result.totalPurchases - filledTotal());
    setCats(c => ({ ...c, other: remainder.toFixed(2) }));
  }

  const canFillRest =
    period.mode === 'monthly' &&
    result.totalPurchases > filledTotal() &&
    cats.other === '';

  return (
    <div className="mo-save-section">
      {period.mode === 'monthly' && (
        <div className="mo-cat-inputs">
          <div className="mo-cat-inputs__header">
            <span className="mo-cat-inputs__label">Category Breakdown <span>(optional)</span></span>
            {canFillRest && (
              <button type="button" className="mo-cat-btn mo-cat-btn--fill" onClick={handleFillRest}>
                Fill the Rest
              </button>
            )}
          </div>
          <div className="mo-cat-inputs__grid">
            {([
              { key: 'necessities',  label: 'Necessities',  color: '#E05555' },
              { key: 'travel',       label: 'Travel',       color: '#6B8CFF' },
              { key: 'savings',      label: 'Savings',      color: '#4CAF7D' },
              { key: 'shopping',     label: 'Shopping',     color: '#F0B429' },
              { key: 'investments',  label: 'Investments',  color: '#C084FC' },
              { key: 'other',        label: 'Other',        color: '#8A8070' },
            ] as const).map(({ key, label: catLabel, color }) => (
              <label key={key} className="mo-cat-input">
                <span className="mo-cat-input__dot" style={{ background: color }} />
                <span className="mo-cat-input__label">{catLabel}</span>
                <input
                  className="mo-cat-input__field"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cats[key]}
                  onChange={e => setCats(c => ({ ...c, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mo-save-row">
        <button
          type="button"
          className="btn btn--primary mo-save-btn"
          disabled={busy}
          onClick={handleClick}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ── MoneyOutPage ──────────────────────────────────────────────

export function MoneyOutPage() {
  const [analysisResult, setAnalysisResult] = useState<StatementAnalysisResponseDto | null>(null);
  const [period, setPeriod] = useState<SelectedPeriod | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data: history, isLoading: historyLoading, isError: historyError } = useStatementHistory();
  const { data: annualSummary, isLoading: annualLoading, isError: annualError } = useStatementAnnualSummary();

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const existingRecord = period?.mode === 'monthly' && period.month != null
    ? history?.find(r => r.month === period.month && r.year === period.year)
    : undefined;

  return (
    <div className="mo-page">
      <header className="mo-header">
        <h1 className="mo-title">
          Money Out
          <PageInfoTooltip content={
            <>
              <p>The raw reality of your spending. See exactly where every dollar goes each month — no guessing, no rounding.</p>
              <p>Drop in PDF statements from all your active credit card and spending accounts. This page exists to show you the truth, so you can change it.</p>
            </>
          } />
        </h1>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`mo-toast mo-toast--${toast.type}`}>{toast.message}</div>
      )}

      {/* Upload panel */}
      <section className="mo-section">
        <UploadFlowPanel
          mode="credit"
          onResult={(r) => setAnalysisResult(r as StatementAnalysisResponseDto)}
          onPeriodChange={setPeriod}
        />
      </section>

      {/* Analysis results */}
      {analysisResult && period && (
        <section className="mo-results">
          {/* Inferred-date mismatch warning */}
          {period.mode === 'monthly' &&
            analysisResult.inferredMonth != null &&
            analysisResult.inferredMonth !== period.month && (
              <div className="banner banner--warn">
                The PDF appears to be from{' '}
                {MONTH_NAMES[(analysisResult.inferredMonth ?? 1) - 1]}{' '}
                {analysisResult.inferredYear}. You selected {period.label}. The save will use
                your selection — update the period above if needed.
              </div>
            )}

          <SpendSummaryCard result={analysisResult} period={period} />
          <CategoryBarChart breakdown={analysisResult.categoryBreakdown} />
          <TopMerchantsTable merchants={analysisResult.topMerchants} transactions={analysisResult.transactions} />
          {analysisResult.reportType === 'YearEnd' && (
            <MonthlyBreakdownBarChart breakdown={analysisResult.monthlyBreakdown} />
          )}

          <CumulativeTransactionView
            transactions={analysisResult.transactions}
            breakdown={analysisResult.categoryBreakdown}
            title={`Purchases — ${period.label}`}
            showMonthFilter={period.mode === 'year-end' || analysisResult.reportType === 'YearEnd'}
          />

          <SavePeriodButton
            period={period}
            result={analysisResult}
            existingRecord={existingRecord}
            onSaved={(msg) => showToast('success', msg)}
            onError={(msg) => showToast('error', msg)}
          />
        </section>
      )}

      {/* History section — always visible */}
      <section className="mo-history-section">
        {historyLoading ? (
          <div className="skel skel--chart" />
        ) : historyError ? (
          <div className="banner banner--error">Failed to load spend history. Please refresh.</div>
        ) : (
          <SpendHistoryChart history={history ?? []} />
        )}
        {annualLoading ? (
          <div className="skel skel--table" />
        ) : annualError ? (
          <div className="banner banner--error">Failed to load annual summary. Please refresh.</div>
        ) : (
          <AnnualSummaryTable data={annualSummary} />
        )}
      </section>
    </div>
  );
}
