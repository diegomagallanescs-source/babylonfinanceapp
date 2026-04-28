import { useCallback } from 'react';
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
import './NetWorthChart.css';

interface Props {
  data: NetWorthHistoryPointDto[];
  isLoading: boolean;
  hasProperties: boolean;
  displayKey: 'liquidNetWorth' | 'totalNetWorth';
  accentColor: string;
  period: TimePeriod;
  scrubbedIndex: number | null;
  onScrubIndex: (i: number | null) => void;
}

function xAxisLabel(point: NetWorthHistoryPointDto, period: TimePeriod): string {
  const d = new Date(point.snapshotDate);
  if (period === '1W' || period === '1M' || period === '3M')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  activeIndex: number | null;
  dataLength: number;
  accentColor: string;
  isSecondary?: boolean;
}

function CustomDot({ cx, cy, index, payload, activeIndex, dataLength, accentColor, isSecondary }: DotProps) {
  if (cx == null || cy == null) return null;

  const isLast   = index === dataLength - 1;
  const isActive = activeIndex !== null && index === activeIndex;
  const hasNote  = !!payload?.annotation;

  if (!isLast && !isActive && !hasNote) return null;

  const dotColor  = isSecondary ? '#00E5CC' : accentColor;
  const dotRadius = isActive ? 6 : 4;

  return (
    <g>
      {/* Annotation flag pole + pennant */}
      {hasNote && (
        <>
          <line x1={cx} y1={cy - 2} x2={cx} y2={cy - 20}
            stroke="#F0B429" strokeWidth={1.5} />
          <path d={`M ${cx} ${cy - 20} L ${cx + 11} ${cy - 16} L ${cx} ${cy - 12}`}
            fill="#F0B429" opacity={0.9} />
        </>
      )}
      {/* Point dot */}
      <circle cx={cx} cy={cy} r={dotRadius}
        fill={dotColor} stroke="#0D0D0D" strokeWidth={2} />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomCursor({ points, height }: any) {
  if (!points?.length) return null;
  const { x } = points[0];
  return (
    <line x1={x} y1={0} x2={x} y2={height}
      stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="4 3" />
  );
}

export function NetWorthChart({
  data, isLoading, hasProperties, displayKey, accentColor, period, scrubbedIndex, onScrubIndex,
}: Props) {
  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state.isTooltipActive && state.activeTooltipIndex != null)
        onScrubIndex(state.activeTooltipIndex);
    },
    [onScrubIndex]
  );
  const handleMouseLeave = useCallback(() => onScrubIndex(null), [onScrubIndex]);

  if (isLoading) return <div className="nw-chart__skeleton" />;

  if (data.length < 2) {
    return (
      <div className="nw-chart__empty">
        No snapshots yet for this period.
        <br />
        <small>Take your first snapshot to start tracking.</small>
      </div>
    );
  }

  // Compute domain across both active series so lines never clip
  const vals = data.flatMap(d =>
    hasProperties ? [d.liquidNetWorth, d.totalNetWorth] : [d.liquidNetWorth]
  );
  const dMin = Math.min(...vals);
  const dMax = Math.max(...vals);
  const pad  = Math.abs(dMax - dMin) * 0.06 || Math.abs(dMax) * 0.05;

  return (
    <div className="nw-chart__canvas">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={data}
          margin={{ top: 16, right: 4, left: 4, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="nwGradLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accentColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="nwGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00E5CC" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#00E5CC" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="snapshotDate"
            tickFormatter={(v) => xAxisLabel({ snapshotDate: v } as NetWorthHistoryPointDto, period)}
            tick={{ fill: '#8A8070', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={55}
          />
          <YAxis hide domain={[dMin - pad, dMax + pad]} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />

          <Tooltip content={() => null} cursor={<CustomCursor />} />

          {/* Total NW — rendered first so liquid line sits on top */}
          {hasProperties && (
            <Area
              type="monotone"
              dataKey="totalNetWorth"
              stroke="#00E5CC"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#nwGradTotal)"
              dot={
                <CustomDot
                  activeIndex={displayKey === 'totalNetWorth' ? scrubbedIndex : null}
                  dataLength={data.length}
                  accentColor={accentColor}
                  isSecondary
                />
              }
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          {/* Liquid NW — primary line */}
          <Area
            type="monotone"
            dataKey="liquidNetWorth"
            stroke={accentColor}
            strokeWidth={2}
            fill="url(#nwGradLiquid)"
            dot={
              <CustomDot
                activeIndex={displayKey === 'liquidNetWorth' ? scrubbedIndex : null}
                dataLength={data.length}
                accentColor={accentColor}
              />
            }
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
