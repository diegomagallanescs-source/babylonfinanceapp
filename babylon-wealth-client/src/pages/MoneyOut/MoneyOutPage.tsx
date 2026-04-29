import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList,
} from 'recharts';

import { UploadFlowPanel } from '../../components/UploadFlowPanel';
import { formatCurrency } from '../../utils/format';
import type {
  StatementAnalysisResponseDto,
  CategoryBreakdownDto,
  TopMerchantDto,
  MonthlySpendDto,
  SelectedPeriod,
} from '../../types/statements';
import './MoneyOutPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── SpendSummaryCard ──────────────────────────────────────────

interface SpendSummaryCardProps {
  result: StatementAnalysisResponseDto;
  period: SelectedPeriod;
}

function SpendSummaryCard({ result, period }: SpendSummaryCardProps) {
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
      <div className="mo-tooltip__row">
        <span>Total</span>
        <span>{formatCurrency(d.total)}</span>
      </div>
      <div className="mo-tooltip__row">
        <span>Transactions</span>
        <span>{d.count}</span>
      </div>
      <div className="mo-tooltip__row">
        <span>Share</span>
        <span>{d.percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function CategoryBarChart({ breakdown }: { breakdown: CategoryBreakdownDto[] }) {
  const sorted = [...breakdown].sort((a, b) => b.total - a.total);

  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Spending by Category</div>
      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 38)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="category"
            width={140}
            tick={{ fill: 'var(--color-text-sub)', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {sorted.map((_, i) => (
              <Cell
                key={i}
                fill="var(--color-negative)"
                fillOpacity={1 - i * 0.06}
              />
            ))}
            <LabelList
              dataKey="percentage"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              style={{ fill: 'var(--color-text-sub)', fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TopMerchantsTable ─────────────────────────────────────────

function TopMerchantsTable({ merchants }: { merchants: TopMerchantDto[] }) {
  return (
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
            <tr key={i}>
              <td>{m.name}</td>
              <td className="mo-merchants-table__num">{formatCurrency(m.total)}</td>
              <td className="mo-merchants-table__num mo-merchants-table__count">{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── MonthlyBreakdownBarChart ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mo-tooltip">
      <div className="mo-tooltip__name">{label}</div>
      <div className="mo-tooltip__row">
        <span>Spend</span>
        <span>{formatCurrency(payload[0].value)}</span>
      </div>
      <div className="mo-tooltip__row">
        <span>Transactions</span>
        <span>{payload[0].payload.count}</span>
      </div>
    </div>
  );
}

function MonthlyBreakdownBarChart({ breakdown }: { breakdown: MonthlySpendDto[] }) {
  const sorted = [...breakdown].sort((a, b) => a.month - b.month);

  return (
    <div className="mo-chart-card">
      <div className="mo-chart-card__title">Monthly Breakdown</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={sorted}
          margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
          barCategoryGap="28%"
        >
          <XAxis
            dataKey="monthName"
            tick={{ fill: 'var(--color-text-sub)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={44}
          />
          <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="total" fill="var(--color-negative)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MoneyOutPage ──────────────────────────────────────────────

export function MoneyOutPage() {
  const [analysisResult, setAnalysisResult] = useState<StatementAnalysisResponseDto | null>(null);
  const [period, setPeriod] = useState<SelectedPeriod | null>(null);

  return (
    <div className="mo-page">
      <header className="mo-header">
        <h1 className="mo-title">Money Out</h1>
      </header>

      <section className="mo-section">
        <UploadFlowPanel
          mode="credit"
          onResult={(r) => setAnalysisResult(r as StatementAnalysisResponseDto)}
          onPeriodChange={setPeriod}
        />
      </section>

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
          <TopMerchantsTable merchants={analysisResult.topMerchants} />
          {analysisResult.reportType === 'YearEnd' && (
            <MonthlyBreakdownBarChart breakdown={analysisResult.monthlyBreakdown} />
          )}
        </section>
      )}
    </div>
  );
}
