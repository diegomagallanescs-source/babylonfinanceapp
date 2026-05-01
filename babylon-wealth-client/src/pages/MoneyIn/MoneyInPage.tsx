import { useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';

import { UploadFlowPanel } from '../../components/UploadFlowPanel';
import { CumulativeTransactionView } from '../../components/CumulativeTransactionView';
import { useCheckingHistory } from '../../hooks/useCheckingHistory';
import { useSaveChecking } from '../../hooks/useSaveChecking';
import { useUpdateChecking } from '../../hooks/useUpdateChecking';
import { useStatementAnnualSummary } from '../../hooks/useStatementAnnualSummary';
import { formatCurrency } from '../../utils/format';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import type {
  CheckingStatementResponseDto,
  CheckingStatementSummaryDto,
  CheckingCategoryBreakdownDto,
  CheckingTransactionDto,
  AnnualFinancialSummaryDto,
  SaveCheckingStatementRequest,
  IncomeCategoryItem,
  SelectedPeriod,
} from '../../types/statements';
import './MoneyInPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DONUT_COLORS = [
  '#00E676', '#00E5CC', '#F0B429', '#6B8CFF',
  '#FF9A3C', '#C084FC', '#22D3EE', '#F472B6',
];

// ── Date helper (handles MM/DD/YYYY and YYYY-MM-DD) ───────────

function extractYearMonth(date: string): string | null {
  if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
  const parts = date.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

// ── MoneyFlowSummaryCards ─────────────────────────────────────

function MoneyFlowSummaryCards({ result }: { result: CheckingStatementResponseDto }) {
  const net = result.netFlow;
  const pos = net >= 0;
  return (
    <div className="mi-kpi-row">
      <div className="mi-kpi-card">
        <div className="mi-kpi-card__label">Total Money In</div>
        <div className="mi-kpi-card__value mi-kpi-card__value--in">
          {formatCurrency(result.totalMoneyIn)}
        </div>
      </div>
      <div className="mi-kpi-card">
        <div className="mi-kpi-card__label">Total Money Out</div>
        <div className="mi-kpi-card__value mi-kpi-card__value--out">
          {formatCurrency(result.totalMoneyOut)}
        </div>
      </div>
      <div className="mi-kpi-card">
        <div className="mi-kpi-card__label">Net Flow</div>
        <div className={`mi-kpi-card__value ${pos ? 'mi-kpi-card__value--pos' : 'mi-kpi-card__value--neg'}`}>
          {pos ? '+' : ''}{formatCurrency(net)}
        </div>
      </div>
    </div>
  );
}

// ── MoneyInDonutChart ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: CheckingCategoryBreakdownDto = payload[0].payload;
  return (
    <div className="mi-tooltip">
      <div className="mi-tooltip__name">{d.category}</div>
      <div className="mi-tooltip__row"><span>Total</span><span>{formatCurrency(d.total)}</span></div>
      <div className="mi-tooltip__row"><span>Share</span><span>{d.percentage.toFixed(1)}%</span></div>
      <div className="mi-tooltip__row"><span>Transactions</span><span>{d.count}</span></div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <ul className="mi-donut-legend">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <li key={i} className="mi-donut-legend__item">
          <span className="mi-donut-legend__swatch" style={{ background: entry.color }} />
          <span className="mi-donut-legend__label">{entry.value}</span>
          <span className="mi-donut-legend__pct">{entry.payload.percentage.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}

function MoneyInDonutChart({ breakdown }: { breakdown: CheckingCategoryBreakdownDto[] }) {
  const data = [...breakdown].filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  if (data.length === 0) return null;
  return (
    <div className="mi-chart-card">
      <div className="mi-chart-card__title">Money In Breakdown</div>
      <div className="mi-donut-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%"
              innerRadius={60} outerRadius={95} paddingAngle={2} strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
            <Legend content={<DonutLegend />} layout="vertical" align="right" verticalAlign="middle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── MoneyInHistoryChart ───────────────────────────────────────

const CAT_PALETTE = ['#00A84F','#4D6FD9','#D4951A','#9B5FD9','#D97B2A','#1AB8CC','#D95C8A','#3A9E6A'];

function historyLabel(r: CheckingStatementSummaryDto): string {
  return `${MONTH_SHORT[r.month - 1]} '${String(r.year).slice(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MoneyInHistoryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const cats = payload.filter((p: any) => p.dataKey !== 'moneyIn' && p.value > 0);
  const hasCats = cats.length > 0;
  const total = hasCats
    ? cats.reduce((s: number, p: any) => s + p.value, 0)
    : payload[0].value;
  return (
    <div className="mi-tooltip">
      <div className="mi-tooltip__name">{label}</div>
      {hasCats
        ? cats.map((p: any) => (
            <div key={p.dataKey} className="mi-tooltip__row">
              <span style={{ color: p.fill }}>{p.name}</span>
              <span>{formatCurrency(p.value)}</span>
            </div>
          ))
        : null
      }
      <div className="mi-tooltip__row mi-tooltip__row--total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function MoneyInHistoryChart({ history }: { history: CheckingStatementSummaryDto[] }) {
  const sorted = [...history].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  // Collect all unique category names across all records
  const allCatNames = Array.from(
    new Set(sorted.flatMap(r => (r.incomeCategories ?? []).map(c => c.name)))
  );
  const hasCategoryData = allCatNames.length > 0;

  const data = sorted.map(r => {
    const base: Record<string, unknown> = { label: historyLabel(r), moneyIn: r.totalMoneyIn };
    allCatNames.forEach(name => {
      base[name] = r.incomeCategories.find(c => c.name === name)?.amount ?? 0;
    });
    return base;
  });

  if (data.length === 0) {
    return (
      <div className="mi-chart-card">
        <div className="mi-chart-card__title">Money In History</div>
        <div className="mi-empty-state">
          <span>📄</span>
          <p>No statements saved yet. Upload a PDF above and click Save to start tracking.</p>
        </div>
      </div>
    );
  }

  const yearTotals = sorted.reduce<Record<number, number>>((acc, r) => {
    acc[r.year] = (acc[r.year] ?? 0) + r.totalMoneyIn;
    return acc;
  }, {});
  const yearEntries = Object.entries(yearTotals)
    .map(([y, t]) => ({ year: Number(y), total: t }))
    .sort((a, b) => b.year - a.year);

  if (!hasCategoryData) {
    return (
      <div className="mi-chart-card">
        <div className="mi-chart-card__title">Money In History</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="moneyInGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00A84F" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#00A84F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
            <Tooltip content={<MoneyInHistoryTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="moneyIn" stroke="#00A84F" strokeWidth={2}
              fill="url(#moneyInGrad)" dot={false} activeDot={{ r: 4, fill: '#00A84F' }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mi-year-totals">
          {yearEntries.map(({ year, total }) => (
            <div key={year} className="mi-year-total">
              <span className="mi-year-total__year">{year}</span>
              <span className="mi-year-total__value">{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mi-chart-card">
      <div className="mi-chart-card__title">Money In by Category</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
          <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
          <Tooltip content={<MoneyInHistoryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => <span style={{ color: 'var(--color-text-sub)' }}>{value}</span>}
          />
          {allCatNames.map((name, i) => (
            <Bar key={name} dataKey={name} name={name} stackId="a"
              fill={CAT_PALETTE[i % CAT_PALETTE.length]} fillOpacity={0.9}
              radius={i === allCatNames.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mi-year-totals">
        {yearEntries.map(({ year, total }) => (
          <div key={year} className="mi-year-total">
            <span className="mi-year-total__year">{year}</span>
            <span className="mi-year-total__value">{formatCurrency(total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CheckingAnnualSummaryTable ────────────────────────────────

function CheckingAnnualSummaryTable({ data }: { data: AnnualFinancialSummaryDto[] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <div className="mi-chart-card">
        <div className="mi-chart-card__title">Annual Summary</div>
        <div className="mi-empty-state">
          <span>📊</span>
          <p>Save statements from multiple months to see yearly totals.</p>
        </div>
      </div>
    );
  }
  const sorted = [...data].sort((a, b) => b.year - a.year);
  return (
    <div className="mi-chart-card">
      <div className="mi-chart-card__title">Annual Summary</div>
      <table className="mi-annual-table">
        <thead>
          <tr>
            <th>Year</th>
            <th className="mi-annual-table__num">Money In</th>
            <th className="mi-annual-table__num">Net Savings</th>
            <th className="mi-annual-table__num">Months Recorded</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.year}>
              <td className="mi-annual-table__year">{row.year}</td>
              <td className="mi-annual-table__num mi-annual-table__in">
                {formatCurrency(row.totalMoneyIn, true)}
              </td>
              <td className={`mi-annual-table__num ${row.netSavings >= 0 ? 'mi-annual-table__pos' : 'mi-annual-table__neg'}`}>
                {row.netSavings >= 0 ? '+' : ''}{formatCurrency(row.netSavings, true)}
              </td>
              <td className="mi-annual-table__num mi-annual-table__months">
                {row.checkingMonthsRecorded}/12
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CheckingSavePeriodButton ──────────────────────────────────

interface CheckingSavePeriodButtonProps {
  period: SelectedPeriod;
  result: CheckingStatementResponseDto;
  existingRecord: CheckingStatementSummaryDto | undefined;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}

const EMPTY_CAT = (): IncomeCategoryItem => ({ name: '', amount: 0 });

function CheckingSavePeriodButton({
  period,
  result,
  existingRecord,
  onSaved,
  onError,
}: CheckingSavePeriodButtonProps) {
  const [progress, setProgress] = useState<string | null>(null);
  const [cats, setCats] = useState<IncomeCategoryItem[]>([EMPTY_CAT()]);
  const saveMutation = useSaveChecking();
  const updateMutation = useUpdateChecking();
  const queryClient = useQueryClient();

  const busy = saveMutation.isPending || updateMutation.isPending || progress !== null;

  const yearEndMonthCount = period.mode === 'year-end'
    ? new Set(result.transactions.map(t => extractYearMonth(t.date)).filter(Boolean)).size
    : 0;

  const label = progress
    ?? (period.mode === 'year-end'
      ? `Save All ${yearEndMonthCount} Months →`
      : existingRecord
        ? `Update ${period.label} →`
        : `Save ${period.label} →`);

  function validCats(): IncomeCategoryItem[] {
    return cats.filter(c => c.name.trim() !== '' && c.amount > 0);
  }

  function filledTotal(): number {
    return cats.reduce((s, c) => s + (c.amount || 0), 0);
  }

  function handleFillRest() {
    const remainder = Math.max(0, result.totalMoneyIn - filledTotal());
    // Find first row with no amount, or add a new row
    const idx = cats.findIndex(c => c.amount === 0);
    if (idx !== -1) {
      setCats(prev => prev.map((c, i) => i === idx ? { ...c, amount: remainder } : c));
    } else if (cats.length < 5) {
      setCats(prev => [...prev, { name: 'Other', amount: remainder }]);
    }
  }

  function canFillRest(): boolean {
    const remainder = result.totalMoneyIn - filledTotal();
    return remainder > 0 && (cats.some(c => c.amount === 0) || cats.length < 5);
  }

  const handleMonthlySave = async () => {
    const valid = validCats();
    if (valid.length === 0 && cats.some(c => c.name.trim() !== '' || c.amount > 0)) {
      onError('Each category needs both a name and an amount greater than zero.');
      return;
    }
    const payload: SaveCheckingStatementRequest = {
      month: period.month!,
      year: period.year,
      totalMoneyIn: result.totalMoneyIn,
      totalMoneyOut: result.totalMoneyOut,
      transactionCount: result.transactionCount,
      accountsIncluded: result.accountsDetected.join(', '),
      incomeCategories: valid.length > 0 ? valid : undefined,
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
    const byMonth = new Map<string, { moneyIn: number; moneyOut: number; count: number }>();
    (result.transactions as CheckingTransactionDto[]).forEach(t => {
      const key = extractYearMonth(t.date);
      if (!key) return;
      const entry = byMonth.get(key) ?? { moneyIn: 0, moneyOut: 0, count: 0 };
      if (t.direction === 'In' && t.category !== 'Self Transfer') entry.moneyIn += t.amount;
      if (t.direction === 'Out') entry.moneyOut += t.amount;
      entry.count++;
      byMonth.set(key, entry);
    });

    const entries = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    try {
      for (let i = 0; i < entries.length; i++) {
        const [ym, totals] = entries[i];
        setProgress(`Saving ${i + 1} of ${entries.length}…`);
        const [yearStr, monthStr] = ym.split('-');
        await saveMutation.mutateAsync({
          month: parseInt(monthStr, 10),
          year: parseInt(yearStr, 10),
          totalMoneyIn: totals.moneyIn,
          totalMoneyOut: totals.moneyOut,
          transactionCount: totals.count,
          accountsIncluded: result.accountsDetected.join(', '),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['checking-history'] });
      queryClient.invalidateQueries({ queryKey: ['statement-annual-summary'] });
      onSaved(`${entries.length} months saved for ${period.year} ✓`);
    } catch {
      onError('Some months failed to save. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  const handleClick = async () => {
    try {
      if (period.mode === 'year-end') await handleYearEndSave();
      else await handleMonthlySave();
    } catch {
      onError('Save failed. Please try again.');
    }
  };

  return (
    <div className="mi-save-section">
      {period.mode === 'monthly' && (
        <div className="mi-cat-inputs">
          <div className="mi-cat-inputs__header">
            <div className="mi-cat-inputs__label">Income Breakdown <span>(optional)</span></div>
            <div className="mi-cat-inputs__actions">
              <button
                type="button"
                className="mi-cat-btn mi-cat-btn--fill"
                disabled={!canFillRest()}
                onClick={handleFillRest}
                title={`Remainder: ${formatCurrency(Math.max(0, result.totalMoneyIn - filledTotal()))}`}
              >
                Fill the Rest ({formatCurrency(Math.max(0, result.totalMoneyIn - filledTotal()))})
              </button>
              {cats.length < 5 && (
                <button type="button" className="mi-cat-btn" onClick={() => setCats(p => [...p, EMPTY_CAT()])}>
                  + Add Category
                </button>
              )}
            </div>
          </div>
          <div className="mi-cat-rows">
            {cats.map((cat, i) => (
              <div key={i} className="mi-cat-row">
                <span className="mi-cat-row__num">{i + 1}</span>
                <input
                  className="mi-cat-row__name"
                  type="text"
                  placeholder="Category name…"
                  value={cat.name}
                  onChange={e => setCats(p => p.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                />
                <input
                  className="mi-cat-row__amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cat.amount || ''}
                  onChange={e => setCats(p => p.map((c, j) => j === i ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))}
                />
                <button
                  type="button"
                  className="mi-cat-row__remove"
                  disabled={cats.length === 1}
                  onClick={() => setCats(p => p.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mi-save-row">
        <button type="button" className="btn btn--primary mi-save-btn" disabled={busy} onClick={handleClick}>
          {label}
        </button>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────

interface ToastState { type: 'success' | 'error'; message: string; }

// ── MoneyInPage ───────────────────────────────────────────────

export function MoneyInPage() {
  const [analysisResult, setAnalysisResult] = useState<CheckingStatementResponseDto | null>(null);
  const [period, setPeriod] = useState<SelectedPeriod | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data: history, isLoading: historyLoading, isError: historyError } = useCheckingHistory();
  const { data: annualSummary, isLoading: annualLoading, isError: annualError } = useStatementAnnualSummary();

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const existingRecord = period?.mode === 'monthly' && period.month != null
    ? history?.find(r => r.month === period.month && r.year === period.year)
    : undefined;

  return (
    <div className="mi-page">
      <header className="mi-header">
        <h1 className="mi-title">
          Money In
          <PageInfoTooltip content={
            <>
              <p>The real numbers. See exactly how much money is hitting your accounts each month — post-tax, post-deduction, no estimates.</p>
              <p>Drop in PDFs from all your active bank and checking accounts. This is your true monthly income reality, not what your salary says on paper.</p>
            </>
          } />
        </h1>
      </header>

      {toast && (
        <div className={`mi-toast mi-toast--${toast.type}`}>{toast.message}</div>
      )}

      {/* Upload panel */}
      <section className="mi-section">
        <UploadFlowPanel
          mode="checking"
          onResult={(r) => setAnalysisResult(r as CheckingStatementResponseDto)}
          onPeriodChange={setPeriod}
        />
      </section>

      {/* Analysis results */}
      {analysisResult && period && (
        <section className="mi-results">
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

          {/* Period header */}
          <div className="mi-period-header">
            <span className="mi-period-header__label">{period.label}</span>
            <span className="mi-period-header__meta">
              Checking · {analysisResult.accountsDetected.length} account
              {analysisResult.accountsDetected.length !== 1 ? 's' : ''}
              {analysisResult.accountsDetected.length > 0 && (
                <> ({analysisResult.accountsDetected.join(', ')})</>
              )}
            </span>
          </div>

          <MoneyFlowSummaryCards result={analysisResult} />
          <MoneyInDonutChart breakdown={analysisResult.moneyInBreakdown} />

          <CumulativeTransactionView
            transactions={analysisResult.transactions}
            breakdown={analysisResult.moneyInBreakdown}
            title={`Money In — ${period.label}`}
            showMonthFilter={period.mode === 'year-end'}
          />

          <CheckingSavePeriodButton
            period={period}
            result={analysisResult}
            existingRecord={existingRecord}
            onSaved={(msg) => showToast('success', msg)}
            onError={(msg) => showToast('error', msg)}
          />
        </section>
      )}

      {/* History section — always visible */}
      <section className="mi-history-section">
        {historyLoading ? (
          <div className="skel skel--chart" />
        ) : historyError ? (
          <div className="banner banner--error">Failed to load money-in history. Please refresh.</div>
        ) : (
          <MoneyInHistoryChart history={history ?? []} />
        )}
        {annualLoading ? (
          <div className="skel skel--table" />
        ) : annualError ? (
          <div className="banner banner--error">Failed to load annual summary. Please refresh.</div>
        ) : (
          <CheckingAnnualSummaryTable data={annualSummary} />
        )}
      </section>
    </div>
  );
}
