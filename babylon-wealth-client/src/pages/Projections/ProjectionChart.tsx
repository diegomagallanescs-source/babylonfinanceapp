import { useMemo, useRef, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { ProjectionSnapshotDto } from '../../types/projections';
import { formatCurrency } from '../../utils/format';
import { formatSnapshotDate } from '../../utils/projectionState';
import './ProjectionChart.css';

const PROJECTED_COLOR = '#F0B429'; // gold — the future being modelled
const REALIZED_COLOR  = '#00E5CC'; // river teal — what actually happened
const CHART_H = 300;

interface ChartPoint {
  ts: number;
  projected: number | null;
  realized: number | null;
  projectedSnapshot: ProjectionSnapshotDto | null;
  realizedSnapshot: ProjectionSnapshotDto | null;
}

interface HoverState {
  snapshot: ProjectionSnapshotDto;
  x: number;
  y: number;
  /** True once the dot is past the canvas midpoint, so the card opens to its left. */
  flipLeft: boolean;
}

function toTimestamp(iso: string): number {
  // Snapshot dates are date-only; read them as local midnight so the axis label matches the picker.
  return new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
}

function formatAxisDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatAxisMoney(val: number): string {
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ── Dot ───────────────────────────────────────────────────────
interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  series: 'projected' | 'realized';
  activeId: string | null;
  hoveredId: string | null;
  onHover: (snapshot: ProjectionSnapshotDto, x: number, y: number) => void;
  onLeave: () => void;
}

function SnapshotDot({ cx, cy, payload, series, activeId, hoveredId, onHover, onLeave }: DotProps) {
  const snapshot = series === 'projected' ? payload?.projectedSnapshot : payload?.realizedSnapshot;
  if (cx == null || cy == null || !snapshot) return null;

  const color = series === 'projected' ? PROJECTED_COLOR : REALIZED_COLOR;
  const isActive = activeId === snapshot.id;
  const isHovered = hoveredId === snapshot.id;

  return (
    <g>
      {isActive && <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.2} />}
      {isHovered && <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.25} />}
      <circle
        cx={cx} cy={cy} r={isActive ? 6 : 4.5}
        fill={color} stroke="var(--color-bg)" strokeWidth={2}
      />
      {snapshot.notes && (
        <circle cx={cx + 7} cy={cy - 7} r={2.5} fill="var(--color-text)" opacity={0.75} />
      )}
      {/* Oversized transparent target so the dot is easy to hit */}
      <circle
        cx={cx} cy={cy} r={15}
        fill="transparent"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        onMouseEnter={() => onHover(snapshot, cx, cy)}
        onMouseLeave={onLeave}
      />
    </g>
  );
}

// ── Chart ─────────────────────────────────────────────────────
export function ProjectionChart({
  snapshots,
  activeSnapshotId,
  onViewAccounting,
  onDeleteSnapshot,
}: {
  snapshots: ProjectionSnapshotDto[];
  activeSnapshotId: string | null;
  onViewAccounting: (snapshot: ProjectionSnapshotDto) => void;
  onDeleteSnapshot: (snapshot: ProjectionSnapshotDto) => void;
}) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function openHover(snapshot: ProjectionSnapshotDto, x: number, y: number) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Measured here, not during render, so the card never runs off the right edge
    // at any window size.
    const width = canvasRef.current?.clientWidth ?? 0;
    setHover({ snapshot, x, y, flipLeft: x > width / 2 });
  }

  // Small delay so the pointer can travel from the dot into the card without it closing.
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(null), 220);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  const points = useMemo<ChartPoint[]>(() => {
    const byTs = new Map<number, ChartPoint>();

    for (const s of snapshots) {
      const ts = toTimestamp(s.snapshotDate);
      const point = byTs.get(ts) ?? {
        ts, projected: null, realized: null, projectedSnapshot: null, realizedSnapshot: null,
      };

      // Two snapshots of the same kind on one date: the most recently saved wins the dot.
      if (s.kind === 'Projected') {
        if (!point.projectedSnapshot || s.createdAt > point.projectedSnapshot.createdAt) {
          point.projected = s.totalNetWorth;
          point.projectedSnapshot = s;
        }
      } else {
        if (!point.realizedSnapshot || s.createdAt > point.realizedSnapshot.createdAt) {
          point.realized = s.totalNetWorth;
          point.realizedSnapshot = s;
        }
      }
      byTs.set(ts, point);
    }

    return [...byTs.values()].sort((a, b) => a.ts - b.ts);
  }, [snapshots]);

  const [domainMin, domainMax] = useMemo(() => {
    if (points.length === 0) return [0, 1];
    const min = points[0].ts;
    const max = points[points.length - 1].ts;
    if (min === max) {
      const pad = 15 * 24 * 60 * 60 * 1000; // ±15 days so a single point sits mid-axis
      return [min - pad, max + pad];
    }
    return [min, max];
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="proj-chart__empty">
        No snapshots yet.
        <br />
        <small>Pick a date below, choose Projection or Realized, then save your first snapshot.</small>
      </div>
    );
  }

  const hasProjected = points.some((p) => p.projected !== null);
  const hasRealized  = points.some((p) => p.realized !== null);
  const hoveredId = hover?.snapshot.id ?? null;

  return (
    <div className="proj-chart">
      <div className="proj-chart__legend">
        <span className="proj-chart__legend-item">
          <span className="proj-chart__swatch proj-chart__swatch--projected" />
          Projection
        </span>
        <span className="proj-chart__legend-item">
          <span className="proj-chart__swatch proj-chart__swatch--realized" />
          Realized
        </span>
        <span className="proj-chart__legend-hint">Hover a point to view its accounting</span>
      </div>

      <div className="proj-chart__canvas" ref={canvasRef} onMouseLeave={scheduleClose}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <LineChart data={points} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal vertical={false} stroke="rgba(128,128,128,0.22)" strokeDasharray="3 5" />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={[domainMin, domainMax]}
              tickFormatter={formatAxisDate}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              padding={{ left: 16, right: 16 }}
            />
            <YAxis
              tickFormatter={formatAxisMoney}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={62}
            />
            {/* Hover UI is the dot popover, so the default tooltip stays out of the way. */}
            <Tooltip content={() => null} cursor={false} />

            {hasProjected && (
              <Line
                type="monotone"
                dataKey="projected"
                name="Projection"
                stroke={PROJECTED_COLOR}
                strokeWidth={2}
                strokeDasharray="6 4"
                connectNulls
                isAnimationActive={false}
                activeDot={false}
                dot={
                  <SnapshotDot
                    series="projected"
                    activeId={activeSnapshotId}
                    hoveredId={hoveredId}
                    onHover={openHover}
                    onLeave={scheduleClose}
                  />
                }
              />
            )}

            {hasRealized && (
              <Line
                type="monotone"
                dataKey="realized"
                name="Realized"
                stroke={REALIZED_COLOR}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                activeDot={false}
                dot={
                  <SnapshotDot
                    series="realized"
                    activeId={activeSnapshotId}
                    hoveredId={hoveredId}
                    onHover={openHover}
                    onLeave={scheduleClose}
                  />
                }
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {hover && (
          <div
            className="proj-chart__popover"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${hover.flipLeft ? 'calc(-100% - 18px)' : '18px'}, -50%)`,
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="proj-chart__popover-head">
              <span className={`proj-chart__kind proj-chart__kind--${hover.snapshot.kind.toLowerCase()}`}>
                {hover.snapshot.kind === 'Projected' ? 'Projection' : 'Realized'}
              </span>
              <span className="proj-chart__popover-date">{formatSnapshotDate(hover.snapshot.snapshotDate)}</span>
            </div>

            <div className="proj-chart__popover-value">{formatCurrency(hover.snapshot.totalNetWorth)}</div>
            <div className="proj-chart__popover-sub">
              Liquid {formatCurrency(hover.snapshot.liquidNetWorth)}
            </div>

            {hover.snapshot.notes && (
              <div className="proj-chart__popover-notes">{hover.snapshot.notes}</div>
            )}

            <div className="proj-chart__popover-actions">
              <button
                className="acc-btn acc-btn--primary acc-btn--sm"
                type="button"
                onClick={() => { onViewAccounting(hover.snapshot); setHover(null); }}
              >
                View accounting
              </button>
              <button
                className="acc-btn acc-btn--danger acc-btn--sm"
                type="button"
                onClick={() => { onDeleteSnapshot(hover.snapshot); setHover(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
