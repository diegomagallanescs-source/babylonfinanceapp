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
const CHART_H  = 260;
const M_TOP    = 16;
const M_BOT    = 24;
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
  pinnedIndex: number | null;
  onPinIndex: (i: number | null) => void;
}

// ── Y-axis helpers ────────────────────────────────────────────

/**
 * Smallest "nice" step (a value of the form {1,2,5} × 10^n) that is >= target.
 * Examples:  35_000 → 50_000   75_000 → 100_000   3_500 → 5_000
 */
function niceStep(target: number): number {
  if (target <= 0) return 1;
  const mag  = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** Next "nice" step after the current one (1 → 2 → 5 → 10 → 20 → 50 → ...). */
function nextNiceStep(current: number): number {
  const mag  = Math.pow(10, Math.floor(Math.log10(current)));
  const norm = Math.round(current / mag);
  if (norm < 2)  return 2  * mag;
  if (norm < 5)  return 5  * mag;
  if (norm < 10) return 10 * mag;
  return 20 * mag;
}

/**
 * Builds exactly 3 evenly-spaced ticks (bottom, middle, top) for the Y-axis.
 *
 *  - top    >= max value in the dataset
 *  - bottom <= min value in the dataset
 *  - middle = (bottom + top) / 2 — and all three are clean multiples of a
 *    "nice" step (1k, 2k, 5k, 10k, 20k, 50k, 100k, …)
 *
 * The smallest nice step that bracketing the data with three equally-spaced
 * ticks is chosen, so the labels re-fit automatically when the timeframe
 * changes.
 */
function buildYAxis(vals: number[]): { ticks: number[]; domainMin: number; domainMax: number } {
  if (vals.length === 0) {
    return { ticks: [0, 50_000, 100_000], domainMin: 0, domainMax: 100_000 };
  }

  const dMin = Math.min(...vals);
  const dMax = Math.max(...vals);

  // Flat data — synthesize a step around the single value so labels stay readable.
  if (dMin === dMax) {
    const step = niceStep(Math.max(Math.abs(dMax) / 4, 1));
    return {
      ticks: [dMax - step, dMax, dMax + step],
      domainMin: dMax - step,
      domainMax: dMax + step,
    };
  }

  const avg  = (dMin + dMax) / 2;
  let   step = niceStep((dMax - dMin) / 2);

  // Iterate up nice steps until 3 equally-spaced ticks fully bracket the data.
  for (let i = 0; i < 12; i++) {
    const middle = Math.round(avg / step) * step;
    const bottom = middle - step;
    const top    = middle + step;

    if (top >= dMax && bottom <= dMin) {
      return {
        ticks:    [bottom, middle, top],
        domainMin: bottom,
        domainMax: top,
      };
    }
    step = nextNiceStep(step);
  }

  // Fallback (effectively unreachable for finite numeric input).
  return { ticks: [dMin, (dMin + dMax) / 2, dMax], domainMin: dMin, domainMax: dMax };
}

/**
 * Formats a tick value as a clean dollar string.
 * Whole multiples of 1M / 1K render as "$5M" / "$50K";
 * non-multiples fall back to a comma-separated full number to avoid decimals.
 */
function formatYAxis(val: number): string {
  const sign = val < 0 ? '-' : '';
  const abs  = Math.abs(val);
  if (abs === 0) return '$0';
  if (abs >= 1_000_000 && abs % 1_000_000 === 0) return `${sign}$${abs / 1_000_000}M`;
  if (abs >= 1_000     && abs %     1_000 === 0) return `${sign}$${abs /     1_000}K`;
  return `${sign}$${abs.toLocaleString('en-US')}`;
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
  pinnedIndex: number | null;
  dataLength: number;
  accentColor: string;
  isSecondary?: boolean;
  onPinClick?: (index: number) => void;
}

function CustomDot({ cx, cy, index, payload, activeIndex, pinnedIndex, dataLength, accentColor, isSecondary, onPinClick }: DotProps) {
  if (cx == null || cy == null) return null;

  const isLast   = index === dataLength - 1;
  const isActive = activeIndex !== null && index === activeIndex;
  const isPinned = pinnedIndex !== null && index === pinnedIndex;
  const hasNote  = !!payload?.annotation;

  if (!isLast && !isActive && !isPinned && !hasNote) return null;

  const dotColor  = isSecondary ? '#00E5CC' : accentColor;
  const glowColor = '#F0B429';
  const dotRadius = isPinned ? 6 : isActive ? 5 : 4;

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
      {isLast && !isActive && !isPinned && (
        <circle cx={cx} cy={cy} r={5}
          fill="none" stroke={dotColor} strokeWidth={1.5}
          className="nw-pulse-ring" />
      )}
      {isActive && !isPinned && (
        <circle cx={cx} cy={cy} r={9} fill={dotColor} opacity={0.15} />
      )}
      {isPinned && (
        <>
          <circle cx={cx} cy={cy} r={16} fill={glowColor} opacity={0.18} className="nw-pinned-glow" />
          <circle cx={cx} cy={cy} r={11} fill={glowColor} opacity={0.30} />
          <circle cx={cx} cy={cy} r={8}  fill="none" stroke={glowColor} strokeWidth={1.4} opacity={0.85} />
        </>
      )}
      <circle cx={cx} cy={cy} r={dotRadius}
        fill={isPinned ? glowColor : dotColor} stroke="#0D0D0D" strokeWidth={2} />

      {/* Larger invisible click-target so annotated points are easy to hit */}
      {hasNote && onPinClick && index !== undefined && (
        <circle
          cx={cx} cy={cy} r={14}
          fill="transparent"
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
          onClick={(e) => { e.stopPropagation(); onPinClick(index); }}
        />
      )}
    </g>
  );
}

// ── Chart ─────────────────────────────────────────────────────

export function NetWorthChart({
  data, isLoading, hasProperties, displayKey, accentColor, scrubbedIndex, onScrubIndex, pinnedIndex, onPinIndex,
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

  const handlePinClick = useCallback(
    (idx: number) => {
      // Click pinned point again → unpin. Click a different point → switch pin.
      onPinIndex(pinnedIndex === idx ? null : idx);
    },
    [pinnedIndex, onPinIndex],
  );

  if (isLoading) return <div className="nw-chart__skeleton" />;

  if (data.length < 1) {
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

  const effectiveIndex = pinnedIndex ?? scrubbedIndex;
  const scrubDate = effectiveIndex != null ? data[effectiveIndex]?.snapshotDate : null;

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
                    pinnedIndex={displayKey === 'totalNetWorth' ? pinnedIndex : null}
                    dataLength={data.length}
                    accentColor={accentColor}
                    isSecondary
                    onPinClick={handlePinClick}
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
                pinnedIndex={displayKey === 'liquidNetWorth' ? pinnedIndex : null}
                dataLength={data.length}
                accentColor={accentColor}
                onPinClick={handlePinClick}
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
