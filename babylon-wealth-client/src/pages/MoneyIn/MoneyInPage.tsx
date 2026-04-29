import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

import { UploadFlowPanel } from '../../components/UploadFlowPanel';
import { CumulativeTransactionView } from '../../components/CumulativeTransactionView';
import { formatCurrency } from '../../utils/format';
import type {
  CheckingStatementResponseDto,
  CheckingCategoryBreakdownDto,
  SelectedPeriod,
} from '../../types/statements';
import './MoneyInPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DONUT_COLORS = [
  '#00E676', // positive green
  '#00E5CC', // river teal
  '#F0B429', // gold
  '#6B8CFF', // blue-purple
  '#FF9A3C', // orange
  '#C084FC', // purple
  '#22D3EE', // cyan
  '#F472B6', // pink
];

// ── MoneyFlowSummaryCards ─────────────────────────────────────

function MoneyFlowSummaryCards({ result }: { result: CheckingStatementResponseDto }) {
  const net = result.netFlow;
  const netPositive = net >= 0;

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
        <div className={`mi-kpi-card__value ${netPositive ? 'mi-kpi-card__value--pos' : 'mi-kpi-card__value--neg'}`}>
          {netPositive ? '+' : ''}{formatCurrency(net)}
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
      <div className="mi-tooltip__row">
        <span>Total</span>
        <span>{formatCurrency(d.total)}</span>
      </div>
      <div className="mi-tooltip__row">
        <span>Share</span>
        <span>{d.percentage.toFixed(1)}%</span>
      </div>
      <div className="mi-tooltip__row">
        <span>Transactions</span>
        <span>{d.count}</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <ul className="mi-donut-legend">
      {payload.map((entry: any, i: number) => (
        <li key={i} className="mi-donut-legend__item">
          <span className="mi-donut-legend__swatch" style={{ background: entry.color }} />
          <span className="mi-donut-legend__label">{entry.value}</span>
          <span className="mi-donut-legend__pct">
            {entry.payload.percentage.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function MoneyInDonutChart({ breakdown }: { breakdown: CheckingCategoryBreakdownDto[] }) {
  // Only chart Money In categories (exclude Self Transfer which has 0 or near-0 share)
  const data = [...breakdown]
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  return (
    <div className="mi-chart-card">
      <div className="mi-chart-card__title">Money In Breakdown</div>
      <div className="mi-donut-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
            <Legend
              content={<DonutLegend />}
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── MoneyInPage ───────────────────────────────────────────────

export function MoneyInPage() {
  const [analysisResult, setAnalysisResult] = useState<CheckingStatementResponseDto | null>(null);
  const [period, setPeriod] = useState<SelectedPeriod | null>(null);

  return (
    <div className="mi-page">
      <header className="mi-header">
        <h1 className="mi-title">Money In</h1>
      </header>

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
        </section>
      )}
    </div>
  );
}
