import { useState, useMemo } from 'react';
import { formatCurrency } from '../utils/format';
import './CumulativeTransactionView.css';

// ── Types ─────────────────────────────────────────────────────

export interface CumulativeTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  direction?: string;   // "In" | "Out" — checking only; undefined for credit cards
  accountLast4?: string;
  sourceFile?: string;
}

export interface BreakdownEntry {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface CumulativeTransactionViewProps {
  transactions: CumulativeTransaction[];
  breakdown: BreakdownEntry[];
  title: string;
  showMonthFilter?: boolean;
  printId?: string;
}

type SortKey = 'date' | 'amount' | 'description';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Extract YYYY-MM from various date formats:
 *   YYYY-MM-DD  →  "2026-03"
 *   MM/DD/YYYY  →  "2026-03"
 *   MM/DD       →  null (no year available)
 */
function extractYearMonth(date: string): string | null {
  if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
  const parts = date.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

// ── Component ─────────────────────────────────────────────────

export function CumulativeTransactionView({
  transactions,
  breakdown,
  title,
  showMonthFilter = false,
  printId = 'cumulative-txn-view',
}: CumulativeTransactionViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(true);

  // Unique YYYY-MM values for month filter
  const months = useMemo(() => {
    if (!showMonthFilter) return [];
    const seen = new Set<string>();
    transactions.forEach(t => {
      const ym = extractYearMonth(t.date);
      if (ym) seen.add(ym);
    });
    return [...seen].sort();
  }, [transactions, showMonthFilter]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        const catMatch = !selectedCategory || t.category === selectedCategory;
        const monthMatch = !selectedMonth || extractYearMonth(t.date) === selectedMonth;
        return catMatch && monthMatch;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date')        cmp = a.date.localeCompare(b.date);
        if (sortKey === 'amount')      cmp = a.amount - b.amount;
        if (sortKey === 'description') cmp = a.description.localeCompare(b.description);
        return sortAsc ? cmp : -cmp;
      });
  }, [transactions, selectedCategory, selectedMonth, sortKey, sortAsc]);

  const sortedBreakdown = useMemo(
    () => [...breakdown].sort((a, b) => b.total - a.total),
    [breakdown],
  );

  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0);
  const hasDirection = transactions.some(t => t.direction !== undefined);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="ctv-sort-icon ctv-sort-icon--idle">↕</span>;
    return <span className="ctv-sort-icon">{sortAsc ? '↑' : '↓'}</span>;
  };

  const handleExport = () => {
    document.body.classList.add('printing-transactions');
    window.print();
    document.body.classList.remove('printing-transactions');
  };

  const toggleCategory = (cat: string) =>
    setSelectedCategory(prev => (prev === cat ? null : cat));

  const toggleMonth = (ym: string) =>
    setSelectedMonth(prev => (prev === ym ? null : ym));

  return (
    <div id={printId} className="ctv">
      {/* Print-only header — hidden on screen */}
      <div className="ctv-print-header">
        {title} — exported {new Date().toLocaleDateString()}
        <br />
        {filtered.length} transactions
        {selectedCategory ? ` · Category: ${selectedCategory}` : ''}
        {selectedMonth ? ` · Month: ${formatMonthLabel(selectedMonth)}` : ''}
      </div>

      {/* Screen header */}
      <div className="ctv-header">
        <div className="ctv-header__left">
          <h3 className="ctv-header__title">{title}</h3>
          <span className="ctv-header__meta">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {' · '}Total: {formatCurrency(transactions.reduce((s, t) => s + t.amount, 0))}
          </span>
        </div>
        <button
          type="button"
          className="btn btn--secondary ctv-header__export"
          onClick={handleExport}
        >
          Export to PDF
        </button>
      </div>

      {/* Month filter (year-end only) */}
      {showMonthFilter && months.length > 0 && (
        <div className="ctv-filter-section">
          <span className="ctv-filter-label">Month</span>
          <div className="ctv-pills">
            <button
              type="button"
              className={`pill${!selectedMonth ? ' pill--active' : ''}`}
              onClick={() => setSelectedMonth(null)}
            >
              All
            </button>
            {months.map(ym => (
              <button
                key={ym}
                type="button"
                className={`pill${selectedMonth === ym ? ' pill--active' : ''}`}
                onClick={() => toggleMonth(ym)}
              >
                {formatMonthLabel(ym)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="ctv-filter-section">
        <span className="ctv-filter-label">Category</span>
        <div className="ctv-pills">
          <button
            type="button"
            className={`pill${!selectedCategory ? ' pill--active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All ({transactions.length})
          </button>
          {sortedBreakdown.map(cat => (
            <button
              key={cat.category}
              type="button"
              className={`pill${selectedCategory === cat.category ? ' pill--active' : ''}`}
              onClick={() => toggleCategory(cat.category)}
            >
              {cat.category} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Active filter summary banner */}
      {selectedCategory && (
        <div className="ctv-filter-banner">
          <strong>{selectedCategory}</strong>
          {' — '}{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          {' · '}Total: {formatCurrency(filteredTotal)}
        </div>
      )}

      {/* Transaction table */}
      <div className="ctv-table-wrap">
        <table className="ctv-table">
          <thead>
            <tr>
              {hasDirection && <th className="ctv-th-dir">Dir</th>}
              <th
                className="ctv-th-sortable"
                onClick={() => handleSort('date')}
              >
                Date {sortIcon('date')}
              </th>
              <th
                className="ctv-th-sortable ctv-th-desc"
                onClick={() => handleSort('description')}
              >
                Description {sortIcon('description')}
              </th>
              <th
                className="ctv-th-sortable ctv-th-amount"
                onClick={() => handleSort('amount')}
              >
                Amount {sortIcon('amount')}
              </th>
              <th className="ctv-th-acct">Account</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="ctv-row">
                {hasDirection && (
                  <td className={t.direction === 'In' ? 'ctv-dir-in' : 'ctv-dir-out'}>
                    {t.direction === 'In' ? '+' : '−'}
                  </td>
                )}
                <td className="ctv-td-date">{t.date}</td>
                <td className="ctv-td-desc">{t.description}</td>
                <td className={
                  hasDirection
                    ? (t.direction === 'In' ? 'ctv-amount-in' : 'ctv-amount-out')
                    : 'ctv-amount'
                }>
                  {formatCurrency(t.amount)}
                </td>
                <td className="ctv-td-acct">{t.accountLast4 ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ctv-footer">
        Showing {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
