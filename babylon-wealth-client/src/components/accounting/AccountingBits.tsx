import type { BudgetCategoryResponseDto } from '../../types/ledger';
import { resolveLogo } from './accountingOptions';

/**
 * Small presentational pieces shared by the Accounting tab and the Projections workspace,
 * so a copy of the ledger renders identically in both. Styling comes from
 * AccountingPage.css / LedgerTable.css, imported by the host page.
 */

export function BankCell({ logoUrl, name }: { logoUrl: string | null; name: string | null }) {
  const label = name ?? '—';
  const src = resolveLogo(logoUrl);
  return (
    <div className="lt__bank-cell">
      {src
        ? <img className="lt__bank-logo" src={src} alt={label}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        : <span className="lt__bank-logo-placeholder">{label[0]?.toUpperCase() ?? '?'}</span>
      }
      <span>{label}</span>
    </div>
  );
}

export function CategoryPill({ cat }: { cat: BudgetCategoryResponseDto | undefined }) {
  if (!cat) return <span className="acc-category-pill acc-category-pill--none">—</span>;
  return (
    <span
      className="acc-category-pill"
      style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '55' }}
    >
      {cat.name} ({Math.round(cat.targetPercentage * 100)}%)
    </span>
  );
}

export function UtilBadge({ balance, limit }: { balance: number; limit: number }) {
  if (!limit)        return <span className="acc-util acc-util--none">—</span>;
  if (balance === 0) return <span className="acc-util acc-util--none">0%</span>;
  const pct = (balance / limit) * 100;
  const cls = pct < 30 ? 'acc-util--low' : pct < 60 ? 'acc-util--mid' : 'acc-util--high';
  return <span className={`acc-util ${cls}`}>{pct.toFixed(1)}%</span>;
}

export function BatchSaveBar({
  dirtyCount, saving, onSave, onDiscard,
}: {
  dirtyCount: number; saving: boolean; onSave: () => void; onDiscard: () => void;
}) {
  return (
    <div className="acc-batch-bar">
      <span className="acc-batch-info">⚠ {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
      <div className="acc-batch-actions">
        <button className="acc-btn acc-btn--ghost" onClick={onDiscard} disabled={saving}>Discard</button>
        <button className="acc-btn acc-btn--primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save All →'}
        </button>
      </div>
    </div>
  );
}
