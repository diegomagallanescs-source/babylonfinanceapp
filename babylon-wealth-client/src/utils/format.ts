export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(value) >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}
