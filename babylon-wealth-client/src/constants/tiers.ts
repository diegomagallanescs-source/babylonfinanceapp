export interface Tier {
  label: string;
  minNW: number;
  maxNW: number;
  emoji: string;
  riverRings: number;
  advice: string;
}

// ── Named bands — define label/visual/advice for a NW range ──────────────
interface Band {
  label: string;
  from: number;
  to: number;
  emoji: string;
  rings: 0 | 1 | 2 | 3 | 4 | 5;
  advice: string;
}

const BANDS: Band[] = [
  {
    label: 'Scorched',
    from: -Infinity, to: -50_000,
    emoji: '😭', rings: 0,
    advice: 'The river has run completely dry. Every coin counts — begin chipping away at debt.',
  },
  {
    label: 'Desert',
    from: -50_000, to: -25_000,
    emoji: '😟', rings: 0,
    advice: 'Deep in the desert. Face the numbers honestly — clarity is the first step out.',
  },
  {
    label: 'Parched',
    from: -25_000, to: 0,
    emoji: '😞', rings: 0,
    advice: 'Almost to zero. Every dollar of debt cleared is a dollar of river reclaimed.',
  },
  {
    label: 'Dry Bed',
    from: 0, to: 10_000,
    emoji: '😐', rings: 0,
    advice: 'The earth is dry but you have crossed zero. Save every coin — rivers begin as single drops.',
  },
  {
    label: 'Trickle',
    from: 10_000, to: 25_000,
    emoji: '🙂', rings: 1,
    advice: 'Water moves. Build your emergency fund and put idle coins to work.',
  },
  {
    label: 'Stream',
    from: 25_000, to: 75_000,
    emoji: '😊', rings: 2,
    advice: 'A stream runs clear. Invest consistently — time is your greatest ally.',
  },
  {
    label: 'River',
    from: 75_000, to: 200_000,
    emoji: '😄', rings: 3,
    advice: 'Your river flows. Make your gold multiply as the flocks of the field.',
  },
  {
    label: 'Strong River',
    from: 200_000, to: 500_000,
    emoji: '💪', rings: 4,
    advice: 'The river runs strong. Diversify your streams — let multiple rivers feed the whole.',
  },
  {
    label: 'Mighty River',
    from: 500_000, to: 1_000_000,
    emoji: '🥳', rings: 5,
    advice: 'A mighty river! Passive income approaches your lifestyle needs.',
  },
  {
    label: 'Raging River',
    from: 1_000_000, to: 2_500_000,
    emoji: '🤩', rings: 5,
    advice: 'The river rages with abundance. Your gold earns more than most earn by labor.',
  },
  {
    label: 'Torrent',
    from: 2_500_000, to: 5_000_000,
    emoji: '🌊', rings: 5,
    advice: 'A torrent of wealth. Think in generations — rivers become legacies.',
  },
  {
    label: 'The Ocean',
    from: 5_000_000, to: Infinity,
    emoji: '👑', rings: 5,
    advice: 'You have built an ocean of wealth. Let it flow into legacies worthy of its strength.',
  },
];

function getBand(nw: number): Band {
  return BANDS.find(b => nw >= b.from && nw < b.to) ?? BANDS[BANDS.length - 1];
}

function makeTier(minNW: number, maxNW: number): Tier {
  const band = getBand(minNW);
  return { label: band.label, minNW, maxNW, emoji: band.emoji, riverRings: band.rings, advice: band.advice };
}

function generateTiers(): Tier[] {
  const pts = new Set<number>();

  for (let v = -75_000; v <= 100_000; v += 5_000)  pts.add(v);
  for (let v = 100_000; v <= 500_000; v += 10_000)  pts.add(v);
  for (let v = 500_000; v <= 1_000_000; v += 50_000) pts.add(v);
  for (let v = 1_000_000; v <= 5_000_000; v += 100_000) pts.add(v);

  const sorted = [...pts].sort((a, b) => a - b);

  const tiers: Tier[] = [];
  tiers.push(makeTier(-Infinity, -75_000));
  for (let i = 0; i < sorted.length - 1; i++) tiers.push(makeTier(sorted[i], sorted[i + 1]));
  tiers.push(makeTier(5_000_000, Infinity));

  return tiers;
}

export const TIERS = generateTiers();

// ── Core lookups ──────────────────────────────────────────────────────────

export function getTier(nw: number): Tier {
  return TIERS.find(t => nw >= t.minNW && nw < t.maxNW) ?? TIERS[TIERS.length - 1];
}

export function getTierProgress(nw: number): number {
  const tier = getTier(nw);
  if (!isFinite(tier.minNW) || !isFinite(tier.maxNW)) return 0;
  return Math.max(0, Math.min(1, (nw - tier.minNW) / (tier.maxNW - tier.minNW)));
}

// Immediate next tier step (next $5k / $10k / $50k / $100k milestone)
export function getNextTier(nw: number): Tier | null {
  const current = getTier(nw);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

// Next tier that has a different band label (for showing the next named milestone)
export function getNextBandTier(nw: number): Tier | null {
  const current = getTier(nw);
  return TIERS.find(t => t.minNW >= current.maxNW && t.label !== current.label) ?? null;
}

// ── Absolute level ────────────────────────────────────────────────────────
// Level 0 = the $0 NW tier (Dry Bed, $0–$5k).
// Each tier step up = +1, each step down = −1. No fractions.

const ZERO_TIER_INDEX = TIERS.findIndex(t => t.minNW === 0);

export function getTierLevel(nw: number): number {
  const current = getTier(nw);
  return TIERS.indexOf(current) - ZERO_TIER_INDEX;
}

// ── River speed ───────────────────────────────────────────────────────────

// 0 mph below $10k; every dollar above $10k adds 0.2 mph
export function getRiverMph(nw: number): number {
  if (nw <= 10_000) return 0;
  return (nw - 10_000) * 0.2;
}

// "−25.3 mph", "47.8 mph", "3x · 47.8 mph"
export function formatRiverSpeed(nw: number, rings: number): string {
  const mph = getRiverMph(nw);
  const abs = Math.abs(mph);
  const formatted = abs >= 1000
    ? Math.round(abs).toLocaleString()
    : abs >= 100
    ? abs.toFixed(0)
    : abs.toFixed(1);
  const sign = mph < 0 ? '−' : '';
  if (rings >= 2) return `${rings}x · ${sign}${formatted} mph`;
  return `${sign}${formatted} mph`;
}
