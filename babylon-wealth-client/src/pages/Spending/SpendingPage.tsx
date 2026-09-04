import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import { useSpendingCategories } from '../../hooks/useSpendingCategories';
import { useCreateSpendingCategory } from '../../hooks/useCreateSpendingCategory';
import { usePurchases } from '../../hooks/usePurchases';
import { useCreatePurchase } from '../../hooks/useCreatePurchase';
import { useDeletePurchase } from '../../hooks/useDeletePurchase';
import { useDeletePurchaseMonth } from '../../hooks/useDeletePurchaseMonth';
import { usePurchaseTrendByCategory } from '../../hooks/usePurchaseTrendByCategory';
import { formatCurrency } from '../../utils/format';
import type { SpendingCategoryResponseDto, PurchaseResponseDto, PurchaseTrendPointDto } from '../../types/spending';
import './SpendingPage.css';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ── QuickAddForm ────────────────────────────────────────────────

function QuickAddForm({
  categories,
  editingPurchase,
  onCancelEdit,
  onSaved,
  onError,
}: {
  categories: SpendingCategoryResponseDto[];
  editingPurchase: PurchaseResponseDto | null;
  onCancelEdit: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#C9A84C');

  const createMutation = useCreatePurchase();
  const deleteMutation = useDeletePurchase();
  const createCategoryMutation = useCreateSpendingCategory();

  useEffect(() => {
    if (editingPurchase) {
      setAmount(String(editingPurchase.amount));
      setCategoryId(editingPurchase.categoryId);
      setDescription(editingPurchase.description);
      setDate(editingPurchase.purchaseDate.slice(0, 10));
    }
  }, [editingPurchase]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const busy = createMutation.isPending || deleteMutation.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!categoryId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await createMutation.mutateAsync({
        spendingCategoryId: categoryId,
        amount: parsedAmount,
        description: description.trim() || undefined,
        purchaseDate: `${date}T00:00:00.000Z`,
      });

      if (editingPurchase) {
        await deleteMutation.mutateAsync(editingPurchase.id);
        onSaved('Purchase updated ✓');
        onCancelEdit();
      } else {
        onSaved('Purchase added ✓');
      }
      setAmount('');
      setDescription('');
    } catch {
      onError(editingPurchase ? 'Update failed. Please try again.' : 'Failed to add purchase. Please try again.');
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      const category = await createCategoryMutation.mutateAsync({ name: newCatName.trim(), color: newCatColor });
      setCategoryId(category.id);
      setNewCatName('');
      setShowNewCategory(false);
    } catch {
      onError('Failed to add category — the name may already be in use.');
    }
  }

  return (
    <form className="sp-quick-add" onSubmit={handleSubmit}>
      {editingPurchase && (
        <div className="sp-editing-banner">
          Editing a purchase — saving replaces the original entry.
          <button type="button" className="sp-editing-banner__cancel" onClick={onCancelEdit}>Cancel</button>
        </div>
      )}
      <div className="sp-quick-add__row">
        <label className="sp-field sp-field--amount">
          <span className="sp-field__label">Amount</span>
          <input
            type="number" min="0.01" step="0.01" placeholder="0.00"
            value={amount} onChange={(e) => setAmount(e.target.value)} required
          />
        </label>

        <label className="sp-field sp-field--category">
          <span className="sp-field__label">Category</span>
          <div className="sp-category-select">
            <span className="sp-cat-dot" style={{ background: selectedCategory?.color ?? 'transparent' }} />
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </label>

        <label className="sp-field sp-field--desc">
          <span className="sp-field__label">Description <span>(optional)</span></span>
          <input
            type="text" maxLength={500} placeholder="e.g. Trader Joe's"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="sp-field sp-field--date">
          <span className="sp-field__label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <button type="submit" className="btn btn--primary sp-quick-add__submit" disabled={busy}>
          {editingPurchase ? 'Save Changes' : 'Add Purchase'}
        </button>
      </div>

      <div className="sp-new-category">
        {showNewCategory ? (
          <div className="sp-new-category__form">
            <input
              type="text" maxLength={100} placeholder="New category name"
              value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            />
            <input
              type="color" className="sp-new-category__color"
              value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
            />
            <button
              type="button" className="sp-cat-btn sp-cat-btn--add"
              onClick={handleAddCategory} disabled={createCategoryMutation.isPending}
            >
              Add
            </button>
            <button type="button" className="sp-cat-btn" onClick={() => setShowNewCategory(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="sp-cat-btn" onClick={() => setShowNewCategory(true)}>+ New category</button>
        )}
      </div>
    </form>
  );
}

// ── PurchasesTable ──────────────────────────────────────────────

function PurchasesTable({
  purchases,
  onEdit,
  onDeleted,
  onError,
}: {
  purchases: PurchaseResponseDto[];
  onEdit: (p: PurchaseResponseDto) => void;
  onDeleted: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const deleteMutation = useDeletePurchase();

  async function handleDelete(p: PurchaseResponseDto) {
    const ok = window.confirm(`Delete this ${formatCurrency(p.amount)} purchase?`);
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(p.id);
      onDeleted('Purchase deleted');
    } catch {
      onError('Delete failed. Please try again.');
    }
  }

  if (purchases.length === 0) {
    return (
      <div className="sp-empty-state">
        <span>🧾</span>
        <p>No purchases logged yet this month.</p>
      </div>
    );
  }

  return (
    <table className="sp-purchases-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Description</th>
          <th className="sp-purchases-table__num">Amount</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {purchases.map((p) => (
          <tr key={p.id}>
            <td className="sp-purchases-table__date">
              {new Date(p.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </td>
            <td>
              <span className="sp-cat-dot" style={{ background: p.categoryColor }} />
              {p.categoryName}
            </td>
            <td className="sp-purchases-table__desc">{p.description || '—'}</td>
            <td className="sp-purchases-table__num">{formatCurrency(p.amount)}</td>
            <td className="sp-purchases-table__actions">
              <button type="button" className="sp-row-btn" onClick={() => onEdit(p)} title="Edit">✎</button>
              <button
                type="button" className="sp-row-btn sp-row-btn--danger"
                onClick={() => handleDelete(p)} disabled={deleteMutation.isPending} title="Delete"
              >
                ✕
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── SpendingHistoryChart ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpendingTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cats = payload.filter((p: any) => p.value > 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = cats.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="sp-tooltip">
      <div className="sp-tooltip__name">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {cats.map((p: any) => (
        <div key={p.dataKey} className="sp-tooltip__row">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span>{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="sp-tooltip__row sp-tooltip__row--total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function monthTotal(t: PurchaseTrendPointDto): number {
  return t.categories.reduce((s, c) => s + c.amount, 0);
}

function SpendingHistoryChart({
  trend,
  categories,
  onMonthDeleted,
  onError,
}: {
  trend: PurchaseTrendPointDto[];
  categories: SpendingCategoryResponseDto[];
  onMonthDeleted: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const deleteMonthMutation = useDeletePurchaseMonth();

  async function handleDeleteMonth(t: PurchaseTrendPointDto) {
    const ok = window.confirm(`Delete all purchases for ${t.label}? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteMonthMutation.mutateAsync({ month: t.month, year: t.year });
      onMonthDeleted(`${t.label} deleted`);
    } catch {
      onError('Delete failed. Please try again.');
    }
  }

  if (trend.length === 0 || categories.length === 0) {
    return (
      <div className="sp-chart-card">
        <div className="sp-chart-card__title">Spend by Month</div>
        <div className="sp-empty-state">
          <span>📊</span>
          <p>Add a few purchases to see your monthly spend chart.</p>
        </div>
      </div>
    );
  }

  const data = trend.map((t) => {
    const row: Record<string, number | string> = { label: t.label };
    for (const c of categories) row[c.id] = 0;
    for (const c of t.categories) row[c.categoryId] = c.amount;
    return row;
  });

  const sortedByRecent = [...trend].reverse();

  return (
    <div className="sp-chart-card">
      <div className="sp-chart-card__title">Spend by Month</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
          <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44}
          />
          <Tooltip content={<SpendingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => <span style={{ color: 'var(--color-text-sub)' }}>{value}</span>}
          />
          {categories.map((c, i) => (
            <Bar
              key={c.id} dataKey={c.id} name={c.name} stackId="a" fill={c.color}
              fillOpacity={0.9} radius={i === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <table className="sp-month-table">
        <thead>
          <tr>
            <th>Month</th>
            <th className="sp-month-table__num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sortedByRecent.map((t) => (
            <tr key={`${t.year}-${t.month}`}>
              <td>{t.label}</td>
              <td className="sp-month-table__num">{formatCurrency(monthTotal(t))}</td>
              <td className="sp-month-table__action">
                <button
                  type="button" className="sp-month-table__del"
                  onClick={() => handleDeleteMonth(t)} disabled={deleteMonthMutation.isPending}
                  title={`Delete ${t.label}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── SpendingPage ─────────────────────────────────────────────────

export function SpendingPage() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showList, setShowList] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseResponseDto | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useSpendingCategories();
  const { data: purchases, isLoading: purchasesLoading, isError: purchasesError } = usePurchases(month, year);

  const trendTo = now;
  const trendFrom = useMemo(() => new Date(trendTo.getFullYear(), trendTo.getMonth() - 11, 1), [trendTo]);
  const { data: trend, isLoading: trendLoading, isError: trendError } = usePurchaseTrendByCategory(trendFrom, trendTo);

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const monthSum = (purchases ?? []).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="sp-page">
      <header className="sp-header">
        <h1 className="sp-title">
          Spending
          <PageInfoTooltip content={
            <>
              <p>Log individual purchases by hand and watch your monthly spend build up, category by category.</p>
              <p>A standalone tracker — nothing entered here touches your account balances, net worth, or the Money Out statement importer.</p>
            </>
          } />
        </h1>
      </header>

      {toast && <div className={`sp-toast sp-toast--${toast.type}`}>{toast.message}</div>}

      <section className="sp-card">
        {categoriesLoading ? (
          <div className="skel skel--table" />
        ) : categoriesError ? (
          <div className="banner banner--error">Failed to load categories. Please refresh.</div>
        ) : (
          <QuickAddForm
            categories={categories ?? []}
            editingPurchase={editingPurchase}
            onCancelEdit={() => setEditingPurchase(null)}
            onSaved={(msg) => showToast('success', msg)}
            onError={(msg) => showToast('error', msg)}
          />
        )}
      </section>

      <section className="sp-card sp-month-section">
        <div className="sp-month-nav">
          <button type="button" className="sp-month-nav__btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <div className="sp-month-nav__label">{monthLabel}</div>
          <button type="button" className="sp-month-nav__btn" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
        </div>
        <div className="sp-month-summary">
          <span>Total this month</span>
          <span className="sp-month-summary__amount">{formatCurrency(monthSum)}</span>
        </div>
        <button type="button" className="sp-toggle-btn" onClick={() => setShowList((v) => !v)}>
          {showList ? 'Hide' : 'View'} this month's purchases
        </button>
        {showList && (
          purchasesLoading ? (
            <div className="skel skel--table" />
          ) : purchasesError ? (
            <div className="banner banner--error">Failed to load purchases. Please refresh.</div>
          ) : (
            <PurchasesTable
              purchases={purchases ?? []}
              onEdit={(p) => setEditingPurchase(p)}
              onDeleted={(msg) => showToast('success', msg)}
              onError={(msg) => showToast('error', msg)}
            />
          )
        )}
      </section>

      {trendLoading || categoriesLoading ? (
        <div className="skel skel--chart" />
      ) : trendError ? (
        <div className="banner banner--error">Failed to load spend history. Please refresh.</div>
      ) : (
        <SpendingHistoryChart
          trend={trend ?? []}
          categories={categories ?? []}
          onMonthDeleted={(msg) => showToast('success', msg)}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}
