import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetWorth } from '../../hooks/useNetWorth';
import { NetWorthChart } from '../../components/NetWorthChart';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { getTier, getTierProgress, getNextTier } from '../../constants/tiers';
import './RiverPage.css';

// ── Aerial River SVG ──────────────────────────────────────
function AerialRiverScene({ ringCount }: { ringCount: number }) {
  if (ringCount === 0) {
    return (
      <div className="river-scene river-scene--cracked">
        <svg viewBox="0 0 200 130" className="cracked-earth" aria-hidden>
          <ellipse cx="100" cy="65" rx="90" ry="58" fill="#2a1a0a" />
          {[
            'M60 40 Q80 55 70 75',
            'M90 35 Q100 50 95 70',
            'M110 45 Q125 60 115 80',
            'M130 38 Q140 55 135 72',
            'M75 60 Q85 70 80 85',
          ].map((d, i) => (
            <path key={i} d={d} stroke="#4a2e10" strokeWidth="1.5" fill="none" opacity="0.7" />
          ))}
        </svg>
      </div>
    );
  }

  const rings = Array.from({ length: ringCount }, (_, i) => ({
    rx: 52 + i * 22,
    ry: 34 + i * 15,
    opacity: 0.85 - i * 0.14,
    delay: i * 0.4,
  }));

  return (
    <div className="river-scene">
      <svg viewBox="0 0 200 130" className="river-svg" aria-hidden>
        <defs>
          <radialGradient id="riverGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2ec4b6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1B7A6E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="65" rx="95" ry="62" fill="url(#riverGlow)" />
        {rings.map((r, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="65"
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke="#1B7A6E"
            strokeWidth={i === 0 ? 2.5 : 1.8}
            opacity={r.opacity}
            className="river-ring"
            style={{ animationDelay: `${r.delay}s` }}
          />
        ))}
        {ringCount >= 3 && (
          <ellipse cx="100" cy="65" rx="30" ry="18" fill="#1B7A6E" opacity="0.25" className="river-shimmer" />
        )}
      </svg>
    </div>
  );
}

// ── Stick Figure ──────────────────────────────────────────
function StickFigureWithBucket({ emoji }: { emoji: string }) {
  return (
    <div className="stick-figure">
      <AnimatePresence mode="wait">
        <motion.div
          key={emoji}
          className="stick-figure__emoji"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          {emoji}
        </motion.div>
      </AnimatePresence>
      <svg viewBox="0 0 60 80" className="stick-figure__svg" aria-hidden>
        {/* body */}
        <line x1="30" y1="20" x2="30" y2="52" stroke="var(--color-text-muted)" strokeWidth="2" />
        {/* arms */}
        <line x1="30" y1="30" x2="14" y2="44" stroke="var(--color-text-muted)" strokeWidth="2" />
        <line x1="30" y1="30" x2="46" y2="38" stroke="var(--color-text-muted)" strokeWidth="2" />
        {/* legs */}
        <line x1="30" y1="52" x2="20" y2="68" stroke="var(--color-text-muted)" strokeWidth="2" />
        <line x1="30" y1="52" x2="40" y2="68" stroke="var(--color-text-muted)" strokeWidth="2" />
        {/* bucket outline */}
        <rect x="6" y="44" width="14" height="12" rx="1" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
        {/* bucket water fill — animated */}
        <rect x="7" y="50" width="12" height="5" rx="1" fill="var(--color-river)" opacity="0.7" className="bucket-fill" />
      </svg>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
function TierProgressBar({ progress, nextLabel }: { progress: number; nextLabel: string | null }) {
  return (
    <div className="tier-progress">
      <div className="tier-progress__bar">
        <motion.div
          className="tier-progress__fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {nextLabel && (
        <div className="tier-progress__label">Next: {nextLabel}</div>
      )}
    </div>
  );
}

// ── Optimal River Modal ───────────────────────────────────
function OptimalRiverModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="optimal-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="optimal-modal__header">
          <span className="optimal-modal__icon">✦</span>
          <h2>The Optimal River</h2>
        </div>
        <AerialRiverScene ringCount={5} />
        <div className="optimal-modal__content">
          <p className="optimal-modal__tagline">Passive Income ≥ All Lifestyle Expenses</p>
          <div className="optimal-modal__flows">
            <div className="optimal-modal__flow">
              <span className="flow-arrow flow-arrow--lifestyle">→</span>
              <span>Liabilities (lifestyle spending)</span>
            </div>
            <div className="optimal-modal__flow">
              <span className="flow-arrow flow-arrow--reinvest">→</span>
              <span>Reinvestment (more assets)</span>
            </div>
          </div>
          <p className="optimal-modal__quote">
            "Arkad's goal: make your passive income flow faster than your spending drains it."
          </p>
        </div>
        <button className="optimal-modal__close" onClick={onClose}>Close</button>
      </motion.div>
    </div>
  );
}

// ── River Panel (right column) ────────────────────────────
function RiverPanel({ netWorth }: { netWorth: number }) {
  const tier = getTier(netWorth);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="river-panel">
      <div className="river-panel__header">
        <div className="river-panel__title">River</div>
        <div className="river-panel__strength">
          Today's River Strength: <strong>{tier.label}</strong>
        </div>
      </div>

      <AerialRiverScene ringCount={tier.riverRings} />
      <StickFigureWithBucket emoji={tier.emoji} />

      <button className="btn-optimal" onClick={() => setShowModal(true)}>
        See Optimal River
      </button>

      <AnimatePresence>
        {showModal && <OptimalRiverModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Net Worth Panel (left column) ─────────────────────────
function NetWorthPanel() {
  const { user } = useAuth();
  const { data: nw, isLoading } = useNetWorth();
  const [showTotal, setShowTotal] = useState(false);

  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';
  const currentValue = nw
    ? (showTotal ? nw.totalNetWorth : nw.liquidNetWorth)
    : 0;

  const tier = getTier(currentValue);
  const progress = getTierProgress(currentValue);
  const next = getNextTier(currentValue);

  return (
    <div className="nw-panel">
      <div className="nw-panel__greeting">
        <div className="nw-panel__label">Portfolio Overview</div>
        <div className="nw-panel__name">Hello, {displayName}</div>
      </div>

      {nw?.hasProperties && (
        <div className="nw-panel__toggle">
          <button
            className={`toggle-btn${!showTotal ? ' toggle-btn--active' : ''}`}
            onClick={() => setShowTotal(false)}
          >
            Liquid NW
          </button>
          <button
            className={`toggle-btn${showTotal ? ' toggle-btn--active' : ''}`}
            onClick={() => setShowTotal(true)}
          >
            Total NW
          </button>
        </div>
      )}

      <div className="nw-panel__value-row">
        {isLoading ? (
          <div className="nw-panel__value">—</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentValue}
              className="nw-panel__value"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {formatCurrency(currentValue)}
            </motion.div>
          </AnimatePresence>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tier.emoji}
            className="nw-panel__tier-emoji"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {tier.emoji}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="nw-panel__tier-name">{tier.label}</div>

      <TierProgressBar
        progress={progress}
        nextLabel={next ? `${next.label} (${formatCurrency(next.minNW)})` : null}
      />

      <div className="nw-panel__advice">"{tier.advice}"</div>

      {isLoading ? (
        <div className="nw-panel__chart-placeholder">Loading…</div>
      ) : nw ? (
        <NetWorthChart
          currentLiquid={nw.liquidNetWorth}
          currentTotal={nw.totalNetWorth}
          hasProperties={nw.hasProperties}
          showTotal={showTotal}
        />
      ) : null}

      {nw && (
        <div className="nw-panel__stats">
          <div className="nw-panel__stat">
            <div className="nw-panel__stat-label">Assets</div>
            <div className="nw-panel__stat-value nw-panel__stat-value--pos">
              {formatCurrency(nw.totalAssets)}
            </div>
          </div>
          <div className="nw-panel__stat-divider" />
          <div className="nw-panel__stat">
            <div className="nw-panel__stat-label">Liabilities</div>
            <div className="nw-panel__stat-value nw-panel__stat-value--neg">
              {formatCurrency(nw.totalLiabilities)}
            </div>
          </div>
          {nw.creditUtilizationPercent != null && (
            <>
              <div className="nw-panel__stat-divider" />
              <div className="nw-panel__stat">
                <div className="nw-panel__stat-label">Credit Used</div>
                <div className="nw-panel__stat-value">
                  {nw.creditUtilizationPercent.toFixed(1)}%
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────
export function RiverPage() {
  const { data: nw } = useNetWorth();
  const netWorth = nw?.liquidNetWorth ?? 0;

  return (
    <div className="river-page">
      <div className="river-page__left">
        <NetWorthPanel />
      </div>
      <div className="river-page__divider" />
      <div className="river-page__right">
        <RiverPanel netWorth={netWorth} />
      </div>
    </div>
  );
}
