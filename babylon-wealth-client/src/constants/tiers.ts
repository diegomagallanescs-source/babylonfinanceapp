export interface Tier {
  label: string;
  minNW: number;
  maxNW: number;
  emoji: string;
  riverRings: number;
  advice: string;
}

export const TIERS: Tier[] = [
  {
    label: 'Scorched',
    minNW: -Infinity,
    maxNW: -50_000,
    emoji: '😭',
    riverRings: 0,
    advice: 'The river has run dry. Begin where you are — pay down debts first, one coin at a time.',
  },
  {
    label: 'Desert',
    minNW: -50_000,
    maxNW: 0,
    emoji: '😟',
    riverRings: 0,
    advice: 'No river flows yet. Guard every coin. A part of all you earn is yours to keep.',
  },
  {
    label: 'Dry Bed',
    minNW: 0,
    maxNW: 10_000,
    emoji: '😐',
    riverRings: 1,
    advice: 'The first trickle has appeared. Keep saving — rivers begin as single drops.',
  },
  {
    label: 'Stream',
    minNW: 10_000,
    maxNW: 25_000,
    emoji: '🙂',
    riverRings: 2,
    advice: 'A stream flows. Put your gold to work — idle coins earn nothing.',
  },
  {
    label: 'River',
    minNW: 25_000,
    maxNW: 50_000,
    emoji: '😊',
    riverRings: 3,
    advice: 'Your river flows. Make your gold multiply as the flocks of the field.',
  },
  {
    label: 'Strong River',
    minNW: 50_000,
    maxNW: 100_000,
    emoji: '😄',
    riverRings: 4,
    advice: 'The river runs strong. Guard against loss — the first law of gold.',
  },
  {
    label: 'Mighty River',
    minNW: 100_000,
    maxNW: Infinity,
    emoji: '🥳',
    riverRings: 5,
    advice: 'A mighty river! Let it flow into ventures that return a worthy income.',
  },
];

export function getTier(nw: number): Tier {
  return TIERS.find((t) => nw >= t.minNW && nw < t.maxNW) ?? TIERS[TIERS.length - 1];
}

export function getTierProgress(nw: number): number {
  const tier = getTier(nw);
  if (!isFinite(tier.minNW) || !isFinite(tier.maxNW)) return 0;
  const progress = (nw - tier.minNW) / (tier.maxNW - tier.minNW);
  return Math.max(0, Math.min(1, progress));
}

export function getNextTier(nw: number): Tier | null {
  const current = getTier(nw);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}
