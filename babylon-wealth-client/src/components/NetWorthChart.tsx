import { useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { NetWorthHistoryPointDto, TimePeriod } from '../types'; // TimePeriod kept for prop compat
import './NetWorthChart.css';

// ── Layout constants (must match AreaChart margin below) ──────
const CHART_H  = 440;
const M_TOP    = 24;
const M_BOT    = 32;   // generous bottom — guarantees the lowest Y-label never clips
const PLOT_H   = CHART_H - M_TOP - M_BOT;  // vertical space the lines are drawn in

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

// ── Y-axis helpers ────────────────────────────────────────────

function niceStep(rough: number): number {
  if (rough <= 0) return 1000;
  const mag  = Math.pow(10, Math.floor(Math.log10(rough)));
  const n    = rough / mag;
  const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return nice * mag;
}

function buildYAxis(vals: number[]): { ticks: number[]; domainMin: number; domainMax: number } {
  const dMax  = Math.max(...vals);
  const dMin  = Math.min(...vals);
  const range = Math.abs(dMax - dMin) || Math.abs(dMax) || 10_000;

  const rawTop  = dMax + range * 0.22;
  const step    = niceStep(rawTop / 4);
  const niceTop = Math.ceil(rawTop / step) * step;
  const niceBot = Math.max(0, Math.floor(Math.max(0, dMin - range * 0.05) / step) * step);

  const ticks: number[] = [];
  for (let t = niceBot; t <= niceTop + step * 0.01; t += step) {
    ticks.push(Math.round(t));
  }

  const domainMin = dMin < 0 ? dMin - range * 0.05 : niceBot;
  return { ticks, domainMin, domainMax: niceTop };
}

function formatYAxis(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000)     return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)         return `$${Math.round(val / 1_000)}K`;
  return `$${Math.round(val)}`;
}

// Convert a data-domain value to a pixel Y within the chart canvas div
function tickPxY(tick: number, domainMin: number, domainMax: number): number {
  const ratio = (tick - domainMin) / (domainMax - domainMin);
  return M_TOP + (1 - ratio) * PLOT_H;
}

// ── Custom dots ───────────────────────────────────────────────

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
  const dotRadius = isActive ? 5 : 4;

  return (
    <g>
      {hasNote && (
        <>
          <line x1={cx} y1={cy - 2} x2={cx} y2={cy - 20}
            stroke="#F0B429" strokeWidth={1.5} />
          <path d={`M ${cx} ${cy - 20} L ${cx + 11} ${cy - 16} L ${cx} ${cy - 12}`}
            fill="#F0B429" opacity={0.9} />
        </>
      )}
      {isLast && !isActive && (
        <circle cx={cx} cy={cy} r={5}
          fill="none" stroke={dotColor} strokeWidth={1.5}
          className="nw-pulse-ring" />
      )}
      {isActive && (
        <circle cx={cx} cy={cy} r={9} fill={dotColor} opacity={0.15} />
      )}
      <circle cx={cx} cy={cy} r={dotRadius}
        fill={dotColor} stroke="#0D0D0D" strokeWidth={2} />
    </g>
  );
}

// ── Chart ─────────────────────────────────────────────────────

export function NetWorthChart({
  data, isLoading, hasProperties, displayKey, accentColor, scrubbedIndex, onScrubIndex,
}: Props) {
  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state.isTooltipActive && state.activeTooltipIndex != null)
        onScrubIndex(state.activeTooltipIndex);
      else
        onScrubIndex(null);
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

  const vals = data.flatMap(d =>
    hasProperties ? [d.liquidNetWorth, d.totalNetWorth] : [d.liquidNetWorth]
  );
  const { ticks, domainMin, domainMax } = buildYAxis(vals);

  const scrubDate = scrubbedIndex != null ? data[scrubbedIndex]?.snapshotDate : null;

  return (
    <div className="nw-chart__canvas">
      <ResponsiveContainer width="100%" height={CHART_H}>
        <AreaChart
          data={data}
          /*
            margin.right (100) reserves the rightmost strip for the label overlay.
            The hidden YAxis below feeds CartesianGrid the same tick positions our
            HTML labels use, so the dashed lines and labels align exactly.
            XAxis padding.right keeps the live (last) data point away from the labels.
          */
          margin={{ top: M_TOP, right: 100, left: 8, bottom: M_BOT }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/*
              Two-layer fill: vertical gradient (line → bottom fade) + horizontal overlay
              (transparent on left → richer at the current point).
              They blend additively so the bottom-right region under the latest point
              gets the deepest tone, exactly like the reference Robinhood chart.
            */}
            <linearGradient id="nwGradLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accentColor} stopOpacity={0.62} />
              <stop offset="45%"  stopColor={accentColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="nwGradLiquidH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={accentColor} stopOpacity={0} />
              <stop offset="55%"  stopColor={accentColor} stopOpacity={0.06} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0.30} />
            </linearGradient>
            <linearGradient id="nwGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00E5CC" stopOpacity={0.42} />
              <stop offset="45%"  stopColor="#00E5CC" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#00E5CC" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="nwGradTotalH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#00E5CC" stopOpacity={0} />
              <stop offset="55%"  stopColor="#00E5CC" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#00E5CC" stopOpacity={0.22} />
            </linearGradient>
          </defs>

          {/* Grid lines — extend across the full plot area width, stopping just before the label overlay */}
          <CartesianGrid
            horizontal vertical={false}
            stroke="rgba(128,128,128,0.38)"
            strokeDasharray="3 5"
          />

          {/* X-axis hidden; right padding pushes last point away from axis area */}
          <XAxis dataKey="snapshotDate" hide padding={{ right: 48 }} />

          {/*
            Hidden Y-axis — required so CartesianGrid draws horizontal lines
            at exactly the same tick positions our overlay labels use.
            Without it, Recharts auto-generates its own ticks and labels appear
            misaligned with the dashed lines.
          */}
          <YAxis
            hide
            ticks={ticks}
            domain={[domainMin, domainMax]}
            axisLine={false}
            tickLine={false}
          />

          {/* Scrub hairline — controlled ReferenceLine, no click artifacts */}
          {scrubDate && (
            <ReferenceLine
              x={scrubDate}
              stroke="rgba(128,128,128,0.35)"
              strokeWidth={1}
            />
          )}

          <Tooltip content={() => null} cursor={false} />

          {hasProperties && (
            <>
              {/* Total NW horizontal overlay — richer fill toward current point */}
              <Area
                type="monotone"
                dataKey="totalNetWorth"
                stroke="none"
                strokeWidth={0}
                fill="url(#nwGradTotalH)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                legendType="none"
              />
              {/* Total NW main line + vertical gradient */}
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
            </>
          )}

          {/* Liquid NW horizontal overlay — sits behind the main area */}
          <Area
            type="monotone"
            dataKey="liquidNetWorth"
            stroke="none"
            strokeWidth={0}
            fill="url(#nwGradLiquidH)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            legendType="none"
          />

          {/* Liquid NW main line + vertical gradient */}
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

      {/*
        Custom Y-axis labels rendered as an HTML overlay.
        Each label is positioned at the pixel Y of its grid line,
        then shifted down 6px via CSS transform so it sits BELOW the line.
        The overlay sits to the right of the plot area so the grid lines
        visually extend past (to the left of) each label.
      */}
      <div className="nw-chart__ylabels" aria-hidden="true">
        {ticks.map(tick => (
          <span
            key={tick}
            className="nw-chart__ylabel"
            style={{ top: tickPxY(tick, domainMin, domainMax) }}
          >
            {formatYAxis(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}
