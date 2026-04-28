import { useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { NetWorthHistoryPointDto, TimePeriod } from '../types';
import { TimePeriodSelector } from './TimePeriodSelector';
import { formatCurrency, formatDelta, formatPercent } from '../utils/format';
import { useNetWorthHistory } from '../hooks/useNetWorth';
import './NetWorthChart.css';

interface Props {
  currentLiquid: number;
  currentTotal: number;
  hasProperties: boolean;
  showTotal: boolean;
}

function xAxisLabel(point: NetWorthHistoryPointDto, period: TimePeriod): string {
  const d = new Date(point.snapshotDate);
  if (period === '1W' || period === '1M')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (period === '3M' || period === 'YTD')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
  activeIndex: number | null;
  dataLength: number;
}

function CustomDot({ cx, cy, index, activeIndex, dataLength }: CustomDotProps) {
  const isLast = index === dataLength - 1;
  const isActive = activeIndex !== null && index === activeIndex;
  if (!isLast && !isActive) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isActive ? 6 : 4}
      fill="#C9A84C"
      stroke="#0D0D0D"
      strokeWidth={2}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomCursor({ points, height }: any) {
  if (!points?.length) return null;
  const { x } = points[0];
  return (
    <line
      x1={x} y1={0} x2={x} y2={height}
      stroke="rgba(255,255,255,0.25)"
      strokeWidth={1}
    />
  );
}

export function NetWorthChart({ currentLiquid, currentTotal, hasProperties, showTotal }: Props) {
  const [period, setPeriod] = useState<TimePeriod>('1Y');
  const [scrubbedIndex, setScrubbedIndex] = useState<number | null>(null);
  const { data: history, isLoading } = useNetWorthHistory(period);

  const chartData = history ?? [];
  const displayKey = showTotal ? 'totalNetWorth' : 'liquidNetWorth';
  const currentValue = showTotal ? currentTotal : currentLiquid;

  const scrubbedPoint = scrubbedIndex !== null ? chartData[scrubbedIndex] : null;
  const displayValue = scrubbedPoint
    ? (scrubbedPoint[displayKey] as number)
    : currentValue;

  const periodStart = chartData[0]?.[displayKey] as number | undefined;
  const delta = periodStart != null ? displayValue - periodStart : null;
  const pct = periodStart != null && periodStart !== 0
    ? ((displayValue - periodStart) / Math.abs(periodStart)) * 100
    : null;

  const isPositive = delta == null || delta >= 0;
  const accentColor = isPositive ? '#C9A84C' : '#E05555';

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state.isTooltipActive && state.activeTooltipIndex != null)
        setScrubbedIndex(state.activeTooltipIndex);
    },
    []
  );

  const handleMouseLeave = useCallback(() => setScrubbedIndex(null), []);

  return (
    <div className="nw-chart">
      <div className="nw-chart__value" style={{ color: accentColor }}>
        {formatCurrency(displayValue)}
      </div>

      {delta != null && pct != null && (
        <div className={`nw-chart__delta ${isPositive ? 'nw-chart__delta--up' : 'nw-chart__delta--down'}`}>
          <span className="nw-chart__delta-arrow">{isPositive ? '▲' : '▼'}</span>
          {formatDelta(delta)} ({formatPercent(pct)})
          {scrubbedPoint && (
            <span className="nw-chart__delta-date">
              {' '}· {new Date(scrubbedPoint.snapshotDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="nw-chart__skeleton" />
      ) : chartData.length < 2 ? (
        <div className="nw-chart__empty">
          No snapshots yet for this period.
          <br />
          <small>Take your first snapshot to start tracking.</small>
        </div>
      ) : (
        <div className="nw-chart__canvas">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="nwGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
                {hasProperties && showTotal && (
                  <linearGradient id="nwTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B7A6E" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#1B7A6E" stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>

              <XAxis
                dataKey="snapshotDate"
                tickFormatter={(v) =>
                  xAxisLabel({ snapshotDate: v } as NetWorthHistoryPointDto, period)
                }
                tick={{ fill: '#8A8070', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

              <Tooltip
                content={() => null}
                cursor={<CustomCursor />}
              />

              <Area
                type="monotone"
                dataKey={displayKey}
                stroke={accentColor}
                strokeWidth={2}
                fill={`url(#nwGold)`}
                dot={
                  <CustomDot
                    activeIndex={scrubbedIndex}
                    dataLength={chartData.length}
                  />
                }
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <TimePeriodSelector value={period} onChange={setPeriod} />
    </div>
  );
}
