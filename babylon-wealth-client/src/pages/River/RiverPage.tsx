import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetWorth } from '../../hooks/useNetWorth';
import { NetWorthChart } from '../../components/NetWorthChart';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { getTier, getTierProgress, getNextTier } from '../../constants/tiers';
import './RiverPage.css';

// ─────────────────────────────────────────────────────────
// FLOWING RIVER SCENE
// ─────────────────────────────────────────────────────────

function DryBedScene() {
  return (
    <div className="river-scene dry-bed">
      <svg viewBox="0 0 380 260" className="river-svg">
        {/* Sky - parched atmosphere */}
        <defs>
          <radialGradient id="dryAtmos" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#3D1A00" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1A0800" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="380" height="260" fill="#1C1008" />
        <ellipse cx="190" cy="80" rx="180" ry="120" fill="url(#dryAtmos)" />

        {/* Cracked earth base */}
        <ellipse cx="190" cy="155" rx="155" ry="90" fill="#2E1A0A" opacity="0.9" />
        <ellipse cx="190" cy="155" rx="130" ry="75" fill="#3B2210" opacity="0.8" />
        <ellipse cx="190" cy="155" rx="108" ry="62" fill="#4A2D15" />

        {/* Crack lines radiating outward */}
        {[
          'M 190 130 Q 160 140 140 155 Q 120 165 105 175',
          'M 190 130 Q 205 135 220 148 Q 240 162 255 172',
          'M 190 130 Q 188 110 185 95 Q 182 82 180 70',
          'M 190 130 Q 215 125 232 118 Q 248 111 260 105',
          'M 190 130 Q 168 122 152 114 Q 138 107 126 102',
          'M 190 180 Q 178 192 168 205 Q 160 215 156 225',
          'M 190 180 Q 202 190 212 202 Q 220 213 222 224',
          'M 155 150 Q 145 160 138 172',
          'M 230 145 Q 240 155 246 168',
        ].map((d, i) => (
          <path key={i} d={d}
            stroke="#1A0A00" strokeWidth={i < 5 ? 2 : 1.2}
            fill="none" opacity="0.9" />
        ))}
        {/* Secondary fissures */}
        {[
          'M 160 145 Q 155 152 158 160',
          'M 220 150 Q 226 157 222 164',
          'M 175 165 Q 170 170 174 177',
          'M 205 168 Q 210 173 207 180',
          'M 185 195 Q 180 200 183 207',
          'M 200 192 Q 205 198 202 204',
        ].map((d, i) => (
          <path key={i} d={d}
            stroke="#1A0A00" strokeWidth="1"
            fill="none" opacity="0.7" />
        ))}

        {/* Dust particles */}
        {[{cx:120,cy:90},{cx:260,cy:85},{cx:155,cy:65},{cx:225,cy:72},{cx:190,cy:55},{cx:300,cy:120},{cx:80,cy:130}].map((p,i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="2"
            fill="#8B5E3C" opacity="0.4"
            className={`dust-particle dust-particle--${i % 3}`} />
        ))}

        {/* Dead dry grass */}
        {[
          {x:115,y:180,r:-15},{x:270,y:170,r:10},{x:140,y:220,r:5},{x:240,y:215,r:-8},
        ].map((g, i) => (
          <g key={i} transform={`translate(${g.x},${g.y}) rotate(${g.r})`}>
            <line x1="0" y1="0" x2="-4" y2="-16" stroke="#5A3C1A" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="0" x2="0"  y2="-18" stroke="#5A3C1A" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="0" x2="4"  y2="-14" stroke="#5A3C1A" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}

        {/* Heat shimmer lines */}
        {[130,160,190,220,250].map((x, i) => (
          <line key={i} x1={x} y1="50" x2={x+5} y2="85"
            stroke="rgba(255,140,0,0.12)" strokeWidth="1"
            className="heat-shimmer"
            style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </svg>
    </div>
  );
}

// ── Compute river bezier path from half-width ─────────────
function getRiverPath(hw: number): string {
  const cx = 190;
  // S-curve: from top to bottom, curving left then right
  return [
    `M ${cx - hw} -5`,
    `C ${cx - hw - 55} 75, ${cx - hw + 65} 155, ${cx - hw} 265`,
    `L ${cx + hw} 265`,
    `C ${cx + hw + 65} 155, ${cx + hw - 55} 75, ${cx + hw} -5`,
    `Z`,
  ].join(' ');
}

// ── River bank decorations ────────────────────────────────
function RiverBanks({ hw }: { hw: number }) {
  const cx = 190;
  // Grass/vegetation clusters on the banks
  const leftBankX = cx - hw - 30;
  const rightBankX = cx + hw + 15;

  return (
    <g className="river-banks">
      {/* Left bank earth */}
      <path
        d={`M 0 -5 L ${cx - hw} -5 C ${cx - hw - 55} 75, ${cx - hw + 65} 155, ${cx - hw} 265 L 0 265 Z`}
        fill="#1A1206"
      />
      {/* Right bank earth */}
      <path
        d={`M 380 -5 L ${cx + hw} -5 C ${cx + hw + 65} 155, ${cx + hw - 55} 75, ${cx + hw} 265 L 380 265 Z`}
        fill="#1A1206"
      />
      {/* Bank texture strips */}
      <path
        d={`M 0 -5 L ${cx - hw + 8} -5 C ${cx - hw - 47} 75, ${cx - hw + 73} 155, ${cx - hw + 8} 265 L 0 265 Z`}
        fill="#1F1A10" opacity="0.7"
      />
      <path
        d={`M 380 -5 L ${cx + hw - 8} -5 C ${cx + hw + 57} 155, ${cx + hw - 63} 75, ${cx + hw - 8} 265 L 380 265 Z`}
        fill="#1F1A10" opacity="0.7"
      />

      {/* Left-bank vegetation */}
      {[70, 120, 180, 230].map((y, i) => {
        const bx = leftBankX - (i % 2 === 0 ? 5 : 15);
        return (
          <g key={i} transform={`translate(${bx},${y})`}>
            <ellipse cx="0" cy="-4" rx="7" ry="5" fill="#1A3A1A" opacity="0.8" />
            <ellipse cx="6" cy="-6" rx="6" ry="4" fill="#1E421E" opacity="0.7" />
          </g>
        );
      })}

      {/* Right-bank vegetation */}
      {[55, 110, 170, 225].map((y, i) => {
        const bx = rightBankX + (i % 2 === 0 ? 8 : 18);
        return (
          <g key={i} transform={`translate(${bx},${y})`}>
            <ellipse cx="0" cy="-4" rx="8" ry="5" fill="#1A3A1A" opacity="0.8" />
            <ellipse cx="-5" cy="-6" rx="6" ry="4" fill="#1E421E" opacity="0.7" />
          </g>
        );
      })}

      {/* Rocks near the banks */}
      {hw >= 40 && [
        { x: cx - hw - 18, y: 95 }, { x: cx - hw - 12, y: 165 },
        { x: cx + hw + 14, y: 75 }, { x: cx + hw + 18, y: 148 },
      ].map((r, i) => (
        <ellipse key={i} cx={r.x} cy={r.y} rx="7" ry="5"
          fill="#2A2018" stroke="#332A1E" strokeWidth="0.5" />
      ))}
    </g>
  );
}

// ── Water body fill + animation ───────────────────────────
function WaterBody({ hw, speed }: { hw: number; speed: number }) {
  const riverPath = getRiverPath(hw);
  const id = `river-${hw}`;

  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={riverPath} />
        </clipPath>

        {/* Base water gradient */}
        <linearGradient id={`wg-${hw}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#00D4B8" />
          <stop offset="50%"  stopColor="#00A896" />
          <stop offset="100%" stopColor="#00C5AE" />
        </linearGradient>

        {/* Shimmer highlight gradient */}
        <linearGradient id={`ws-${hw}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Flowing diagonal stripe pattern */}
        <pattern id={`fp-${hw}`} width="44" height="44" patternUnits="userSpaceOnUse">
          <animateTransform attributeName="patternTransform" type="translate"
            from="0 0" to={`-44 ${44 * speed * 0.8}`}
            dur={`${1.4 / speed}s`} repeatCount="indefinite" />
          <line x1="0"  y1="0"  x2="44" y2="44" stroke="rgba(255,255,255,0.09)" strokeWidth="3" />
          <line x1="-22" y1="0" x2="22" y2="44" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <line x1="22" y1="0"  x2="66" y2="44" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        </pattern>

        {/* Foam / whitecap pattern for strong rivers */}
        {speed >= 1.5 && (
          <pattern id={`foam-${hw}`} width="60" height="20" patternUnits="userSpaceOnUse">
            <animateTransform attributeName="patternTransform" type="translate"
              from="0 0" to="0 60" dur="0.7s" repeatCount="indefinite" />
            <ellipse cx="10" cy="10" rx="6" ry="2.5" fill="rgba(255,255,255,0.13)" />
            <ellipse cx="38" cy="5"  rx="5" ry="2"   fill="rgba(255,255,255,0.10)" />
            <ellipse cx="52" cy="15" rx="4" ry="1.5"  fill="rgba(255,255,255,0.08)" />
          </pattern>
        )}
      </defs>

      {/* Outer glow ring */}
      <path d={riverPath} fill="none" stroke="rgba(0,229,204,0.18)" strokeWidth="8" />

      {/* Water base */}
      <path d={riverPath} fill={`url(#wg-${hw})`} />

      {/* Flow stripe overlay */}
      <rect width="380" height="265" fill={`url(#fp-${hw})`} clipPath={`url(#${id})`} />

      {/* Shimmer */}
      <rect width="380" height="265" fill={`url(#ws-${hw})`} clipPath={`url(#${id})`} />

      {/* Foam overlay for fast rivers */}
      {speed >= 1.5 && (
        <rect width="380" height="265" fill={`url(#foam-${hw})`} clipPath={`url(#${id})`} />
      )}

      {/* Ripple rings */}
      {[[190, 80], [175, 145], [205, 210]].map(([rx, ry], i) => (
        <circle key={i} cx={rx} cy={ry} r="1"
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"
          clipPath={`url(#${id})`}
          className="ripple-ring"
          style={{ animationDelay: `${i * 0.9}s`, animationDuration: `${2.2 / speed}s` }} />
      ))}

      {/* Sparkle flecks for Mighty River */}
      {speed >= 2 && [
        {x:185,y:60},{x:198,y:120},{x:180,y:195},{x:196,y:170},{x:188,y:240}
      ].map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="1.5"
          fill="#FFFFFF" opacity="0"
          clipPath={`url(#${id})`}
          className="sparkle"
          style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </g>
  );
}

function FlowingRiverScene({ ringCount }: { ringCount: number }) {
  if (ringCount === 0) return <DryBedScene />;

  const hwMap = [0, 18, 45, 80, 118, 162];
  const speedMap = [0, 0.7, 1.0, 1.4, 1.8, 2.3];
  const hw = hwMap[ringCount];
  const speed = speedMap[ringCount];

  return (
    <div className="river-scene">
      <svg viewBox="0 0 380 260" className="river-svg">
        <defs>
          <radialGradient id="sceneAtmos" cx="50%" cy="40%">
            <stop offset="0%" stopColor="rgba(0,200,180,0.08)" />
            <stop offset="100%" stopColor="rgba(0,200,180,0)" />
          </radialGradient>
        </defs>
        {/* Scene background */}
        <rect width="380" height="260" fill="#0C1508" />
        <rect width="380" height="260" fill="url(#sceneAtmos)" />

        <RiverBanks hw={hw} />
        <WaterBody hw={hw} speed={speed} />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CARTOONY CHARACTER
// ─────────────────────────────────────────────────────────

function CartoonCharacter({ tier }: { tier: ReturnType<typeof getTier> }) {
  const smile = tier.riverRings >= 3;
  const neutral = tier.riverRings === 1 || tier.riverRings === 2;
  // frown if riverRings === 0

  return (
    <div className="character-wrap">
      <motion.div
        className="character"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      >
        <svg viewBox="0 0 90 120" className="character-svg">
          {/* ── Shadow ─────────────────────────────── */}
          <ellipse cx="45" cy="116" rx="26" ry="5" fill="rgba(0,0,0,0.4)" />

          {/* ── Shoes ──────────────────────────────── */}
          <ellipse cx="27" cy="108" rx="13" ry="7" fill="#1A2A6C" />
          <ellipse cx="63" cy="108" rx="13" ry="7" fill="#1A2A6C" />
          {/* shoe highlight */}
          <ellipse cx="23" cy="105" rx="5" ry="2.5" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="59" cy="105" rx="5" ry="2.5" fill="rgba(255,255,255,0.15)" />

          {/* ── Legs ───────────────────────────────── */}
          <path d="M 32 78 Q 28 94 28 108" stroke="#2D4A9E" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M 58 78 Q 62 94 62 108" stroke="#2D4A9E" strokeWidth="9" strokeLinecap="round" fill="none" />

          {/* ── Body (shirt) ───────────────────────── */}
          <rect x="22" y="46" width="46" height="36" rx="10" fill="#4C6EF5" />
          {/* shirt collar shadow */}
          <ellipse cx="45" cy="56" rx="14" ry="5" fill="rgba(0,0,0,0.15)" />
          {/* shirt button line */}
          <line x1="45" y1="50" x2="45" y2="78" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
          {/* shirt highlight */}
          <path d="M 26 52 Q 30 48 38 47" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ── Left arm + bucket ──────────────────── */}
          <path d="M 22 56 Q 10 66 8 78" stroke="#4C6EF5" strokeWidth="10" strokeLinecap="round" fill="none" />
          {/* arm shadow/detail */}
          <path d="M 22 56 Q 10 66 8 78" stroke="rgba(0,0,0,0.2)" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Bucket body */}
          <path d="M 0 77 L 4 91 L 17 91 L 20 77 Z" fill="#F0A020" />
          {/* bucket gradient face */}
          <path d="M 0 77 L 4 91 L 17 91 L 20 77 Z" fill="rgba(255,255,255,0.15)" />
          {/* bucket rim */}
          <rect x="-1" y="74" width="22" height="5" rx="2.5" fill="#D4890A" />
          {/* bucket handle */}
          <path d="M 2 74 Q 10 65 18 74" stroke="#A06000" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* bucket water (animated fill) */}
          <clipPath id="bucketClip">
            <path d="M 1 78 L 4 91 L 17 91 L 19 78 Z" />
          </clipPath>
          <rect x="1" y="78" width="18" height="13" fill="rgba(0,200,180,0.8)" clipPath="url(#bucketClip)"
            className="bucket-water" />

          {/* ── Right arm ──────────────────────────── */}
          <path d="M 68 56 Q 80 62 82 74" stroke="#4C6EF5" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M 68 56 Q 80 62 82 74" stroke="rgba(0,0,0,0.2)" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* ── Neck ───────────────────────────────── */}
          <rect x="38" y="38" width="14" height="12" rx="4" fill="#FFCC70" />

          {/* ── Head ───────────────────────────────── */}
          <circle cx="45" cy="24" r="21" fill="#FFDB7E" />
          {/* head shading (depth) */}
          <circle cx="45" cy="24" r="21" fill="url(#headGrad)" />
          <defs>
            <radialGradient id="headGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(200,130,0,0.15)" />
            </radialGradient>
          </defs>
          {/* head outline */}
          <circle cx="45" cy="24" r="21" fill="none" stroke="#D4A030" strokeWidth="1.2" />

          {/* ── Hair ───────────────────────────────── */}
          <path d="M 26 16 Q 30 4 45 3 Q 60 3 64 16" fill="#5A3A00" />
          <path d="M 26 16 Q 24 10 28 6" fill="#5A3A00" />
          <path d="M 64 16 Q 66 10 62 6" fill="#5A3A00" />
          {/* hair highlight */}
          <path d="M 32 8 Q 40 4 50 6" stroke="rgba(255,210,100,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* ── Eyes ───────────────────────────────── */}
          {/* Left eye */}
          <ellipse cx="36" cy="21" rx="5" ry="5.5" fill="white" />
          <circle  cx="37" cy="22" r="3.2"  fill="#1A1A2E" />
          <circle  cx="38" cy="21" r="1.2"  fill="white" />
          {/* Right eye */}
          <ellipse cx="54" cy="21" rx="5" ry="5.5" fill="white" />
          <circle  cx="55" cy="22" r="3.2"  fill="#1A1A2E" />
          <circle  cx="56" cy="21" r="1.2"  fill="white" />

          {/* Eye shading */}
          <ellipse cx="36" cy="20" rx="4.5" ry="2" fill="rgba(180,130,0,0.1)" />
          <ellipse cx="54" cy="20" rx="4.5" ry="2" fill="rgba(180,130,0,0.1)" />

          {/* ── Eyebrows ───────────────────────────── */}
          {smile || neutral ? (
            <>
              <path d="M 31 14 Q 36 11 41 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 49 14 Q 54 11 59 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* worried brows */}
              <path d="M 31 14 Q 36 17 41 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 49 14 Q 54 17 59 14" stroke="#5A3A00" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* ── Mouth ──────────────────────────────── */}
          {smile ? (
            <>
              <path d="M 37 32 Q 45 40 53 32" stroke="#A0600A" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 37 32 Q 45 38 53 32" fill="rgba(200,80,80,0.3)" />
            </>
          ) : neutral ? (
            <line x1="38" y1="34" x2="52" y2="34" stroke="#A0600A" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M 38 37 Q 45 31 52 37" stroke="#A0600A" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}

          {/* ── Cheeks (for happy tiers) ────────────── */}
          {smile && (
            <>
              <ellipse cx="30" cy="30" rx="5" ry="3" fill="rgba(255,120,120,0.3)" />
              <ellipse cx="60" cy="30" rx="5" ry="3" fill="rgba(255,120,120,0.3)" />
            </>
          )}
        </svg>
      </motion.div>

      {/* Tier emoji badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tier.emoji}
          className="character-tier-badge"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        >
          {tier.emoji}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// OPTIMAL RIVER MODAL
// ─────────────────────────────────────────────────────────

function OptimalRiverModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="optimal-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="optimal-modal__header">
          <span>✦</span>
          <h2>The Optimal River</h2>
        </div>
        <FlowingRiverScene ringCount={5} />
        <div className="optimal-modal__body">
          <p className="optimal-modal__tagline">Passive Income ≥ All Lifestyle Expenses</p>
          <div className="optimal-modal__flows">
            <div className="flow-row">
              <div className="flow-dot flow-dot--red" />
              <span>Liabilities — lifestyle expenses drain the river</span>
            </div>
            <div className="flow-row">
              <div className="flow-dot flow-dot--green" />
              <span>Reinvestment — coins flow back to grow the river</span>
            </div>
          </div>
          <blockquote className="optimal-modal__quote">
            "Make thy gold multiply as the flocks of the field — let passive income
            flow faster than thy spending drains it."
          </blockquote>
        </div>
        <button className="optimal-modal__close btn-secondary" onClick={onClose}>Close</button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TIER PROGRESS BAR
// ─────────────────────────────────────────────────────────

function TierProgressBar({ progress, nextLabel }: { progress: number; nextLabel: string | null }) {
  return (
    <div className="tier-progress">
      <div className="tier-progress__track">
        <motion.div
          className="tier-progress__fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="tier-progress__glow"
          initial={{ left: 0 }}
          animate={{ left: `${progress * 100}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {nextLabel && (
        <div className="tier-progress__label">Next: {nextLabel}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// NET WORTH PANEL (left)
// ─────────────────────────────────────────────────────────

function NetWorthPanel() {
  const { user } = useAuth();
  const { data: nw, isLoading } = useNetWorth();
  const [showTotal, setShowTotal] = useState(false);

  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';
  const currentValue = nw ? (showTotal ? nw.totalNetWorth : nw.liquidNetWorth) : 0;
  const tier = getTier(currentValue);
  const progress = getTierProgress(currentValue);
  const next = getNextTier(currentValue);

  return (
    <div className="nw-panel">
      <div className="nw-panel__greeting">
        <div className="nw-panel__eyebrow">Portfolio Overview</div>
        <div className="nw-panel__hello">Hello, {displayName}</div>
      </div>

      {nw?.hasProperties && (
        <div className="toggle-group">
          <button className={`toggle-pill${!showTotal ? ' toggle-pill--active' : ''}`} onClick={() => setShowTotal(false)}>
            Liquid NW
          </button>
          <button className={`toggle-pill${showTotal ? ' toggle-pill--active' : ''}`} onClick={() => setShowTotal(true)}>
            Total NW
          </button>
        </div>
      )}

      <div className="nw-panel__value-row">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentValue}
            className="nw-panel__value"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            {isLoading ? '—' : formatCurrency(currentValue)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="nw-panel__tier-row">
        <AnimatePresence mode="wait">
          <motion.span
            key={tier.label}
            className="tier-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {tier.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <TierProgressBar
        progress={progress}
        nextLabel={next ? `${next.label} at ${formatCurrency(next.minNW)}` : null}
      />

      <div className="nw-panel__advice">
        <span className="advice-icon">✦</span>
        <p>{tier.advice}</p>
      </div>

      {isLoading ? (
        <div className="nw-panel__chart-empty">Loading chart…</div>
      ) : nw ? (
        <div className="nw-panel__chart-wrap">
          <NetWorthChart
            currentLiquid={nw.liquidNetWorth}
            currentTotal={nw.totalNetWorth}
            hasProperties={nw.hasProperties}
            showTotal={showTotal}
          />
        </div>
      ) : null}

      {nw && (
        <div className="stats-row">
          <div className="stat-chip stat-chip--pos">
            <div className="stat-chip__label">Assets</div>
            <div className="stat-chip__value">{formatCurrency(nw.totalAssets)}</div>
          </div>
          <div className="stat-chip stat-chip--neg">
            <div className="stat-chip__label">Liabilities</div>
            <div className="stat-chip__value">{formatCurrency(nw.totalLiabilities)}</div>
          </div>
          {nw.creditUtilizationPercent != null && (
            <div className="stat-chip">
              <div className="stat-chip__label">Credit Used</div>
              <div className="stat-chip__value">{nw.creditUtilizationPercent.toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RIVER PANEL (right)
// ─────────────────────────────────────────────────────────

function RiverPanel({ netWorth }: { netWorth: number }) {
  const tier = getTier(netWorth);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="river-panel">
      <div className="river-panel__header">
        <div className="river-panel__eyebrow">Your River</div>
        <div className="river-panel__strength">
          Strength: <span className="river-panel__tier-label">{tier.label}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tier.label}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="river-glow-wrap"
        >
          <FlowingRiverScene ringCount={tier.riverRings} />
        </motion.div>
      </AnimatePresence>

      <CartoonCharacter tier={tier} />

      <button className="btn-optimal" onClick={() => setShowModal(true)}>
        See Optimal River
      </button>

      <AnimatePresence>
        {showModal && <OptimalRiverModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────

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
