import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import type { TimePeriod } from '../types';
import { TimePeriodSelector } from './TimePeriodSelector';
import { useMoneyFlow } from '../hooks/useMoneyFlow';
import { formatCurrency } from '../utils/format';
import './MoneyFlowChart.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const moneyIn: number = payload.find((p: any) => p.dataKey === 'moneyIn')?.value ?? 0;
  const moneyOut: number = payload.find((p: any) => p.dataKey === 'moneyOut')?.value ?? 0;
  const net = moneyIn - moneyOut;
  return (
    <div className="mf-tooltip">
      <div className="mf-tooltip__label">{label}</div>
      <div className="mf-tooltip__row mf-tooltip__row--in">
        <span>In</span>
        <span>{formatCurrency(moneyIn)}</span>
      </div>
      <div className="mf-tooltip__row mf-tooltip__row--out">
        <span>Out</span>
        <span>{formatCurrency(moneyOut)}</span>
      </div>
      <div className={`mf-tooltip__row mf-tooltip__row--net ${net >= 0 ? 'pos' : 'neg'}`}>
        <span>Net</span>
        <span>{net >= 0 ? '+' : ''}{formatCurrency(net)}</span>
      </div>
    </div>
  );
}

interface BarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}

function BarLabel({ x = 0, y = 0, width = 0, value = 0 }: BarLabelProps) {
  if (Math.abs(value) < 1) return null;
  return (
    <text x={x + width / 2} y={y - 4} fill="#8A8070" textAnchor="middle" fontSize={10}>
      {formatCurrency(value, true)}
    </text>
  );
}

export function MoneyFlowChart() {
  const [period, setPeriod] = useState<TimePeriod>('3M');
  const { data, isLoading } = useMoneyFlow(period);

  const showLabels = data.length <= 6;

  return (
    <div className="mf-chart">
      <div className="mf-chart__header">
        <div>
          <div className="mf-chart__title">Money Flow</div>
          <div className="mf-chart__subtitle">Income vs. Spending</div>
        </div>
      </div>

      {isLoading ? (
        <div className="mf-chart__skeleton" />
      ) : data.length === 0 ? (
        <div className="mf-chart__empty">No data for this period.</div>
      ) : (
        <div className="mf-chart__canvas">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              margin={{ top: 24, right: 4, left: 4, bottom: 0 }}
              barCategoryGap="25%"
              barGap={2}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#8A8070', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: 12, color: '#8A8070', paddingBottom: 8 }}
                formatter={(value) => (value === 'moneyIn' ? 'Money In' : 'Money Out')}
              />

              <Bar dataKey="moneyIn" name="moneyIn" radius={[3, 3, 0, 0]} label={showLabels ? <BarLabel /> : false}>
                {data.map((_, i) => (
                  <Cell key={i} fill="#4CAF7D" fillOpacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="moneyOut" name="moneyOut" radius={[3, 3, 0, 0]} label={showLabels ? <BarLabel /> : false}>
                {data.map((_, i) => (
                  <Cell key={i} fill="#E05555" fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <TimePeriodSelector value={period} onChange={setPeriod} />
    </div>
  );
}
