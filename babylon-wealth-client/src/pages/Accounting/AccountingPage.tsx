import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';

import { useNetWorth } from '../../hooks/useNetWorth';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useLoans } from '../../hooks/useLoans';
import { useInvestments } from '../../hooks/useInvestments';
import { usePendingItems } from '../../hooks/usePendingItems';
import { useProperties } from '../../hooks/useProperties';

import {
  updateAccount, deleteAccount,
  updateCreditCard,
  updateLoan,
  updateInvestment,
  settlePendingItem,
} from '../../api/ledger';

import { LedgerTable, type RowVariant } from '../../components/LedgerTable';

import type {
  BankAccountResponseDto, UpdateBankAccountRequest,
  CreditCardResponseDto, UpdateCreditCardRequest,
  LoanResponseDto, UpdateLoanRequest,
  InvestmentResponseDto, UpdateInvestmentRequest,
  PendingItemResponseDto,
  PropertyResponseDto,
} from '../../types/ledger';

import { formatCurrency } from '../../utils/format';
import './AccountingPage.css';

// ── Helpers ──────────────────────────────────────────────────
function BankCell({ logoUrl, name }: { logoUrl: string | null; name: string | null }) {
  const label = name ?? 'Unknown';
  return (
    <div className="lt__bank-cell">
      {logoUrl ? (
        <img className="lt__bank-logo" src={logoUrl} alt={label} />
      ) : (
        <span className="lt__bank-logo-placeholder">{label[0]}</span>
      )}
      <span>{label}</span>
    </div>
  );
}

type Tab = 'accounts' | 'cards' | 'loans' | 'investments' | 'pending' | 'properties';

const TABS: { key: Tab; label: string }[] = [
  { key: 'accounts',    label: 'Bank Accounts' },
  { key: 'cards',       label: 'Credit Cards' },
  { key: 'loans',       label: 'Loans' },
  { key: 'investments', label: 'Investments' },
  { key: 'pending',     label: 'Pending' },
  { key: 'properties',  label: 'Properties' },
];

// ── Main component ───────────────────────────────────────────
export function AccountingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('accounts');
  const qc = useQueryClient();

  const { data: nw } = useNetWorth();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: cards, isLoading: loadingCards } = useCreditCards();
  const { data: loans, isLoading: loadingLoans } = useLoans();
  const { data: investments, isLoading: loadingInvestments } = useInvestments();
  const { data: pending, isLoading: loadingPending } = usePendingItems();
  const { data: properties, isLoading: loadingProperties } = useProperties();

  // ── Dirty maps (batch-save pattern) ──────────────────────
  const [dirtyAccounts, setDirtyAccounts]       = useState<Map<string, UpdateBankAccountRequest>>(new Map());
  const [dirtyCards, setDirtyCards]             = useState<Map<string, UpdateCreditCardRequest>>(new Map());
  const [dirtyLoans, setDirtyLoans]             = useState<Map<string, UpdateLoanRequest>>(new Map());
  const [dirtyInvestments, setDirtyInvestments] = useState<Map<string, UpdateInvestmentRequest>>(new Map());

  const [saving, setSaving] = useState(false);

  // ── Save handlers ────────────────────────────────────────
  async function saveAccounts() {
    setSaving(true);
    await Promise.all([...dirtyAccounts.entries()].map(([id, ch]) => updateAccount(id, ch)));
    setDirtyAccounts(new Map());
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
    setSaving(false);
  }

  async function saveCards() {
    setSaving(true);
    await Promise.all([...dirtyCards.entries()].map(([id, ch]) => updateCreditCard(id, ch)));
    setDirtyCards(new Map());
    qc.invalidateQueries({ queryKey: ['creditcards'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
    setSaving(false);
  }

  async function saveLoans() {
    setSaving(true);
    await Promise.all([...dirtyLoans.entries()].map(([id, ch]) => updateLoan(id, ch)));
    setDirtyLoans(new Map());
    qc.invalidateQueries({ queryKey: ['loans'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
    setSaving(false);
  }

  async function saveInvestments() {
    setSaving(true);
    await Promise.all([...dirtyInvestments.entries()].map(([id, ch]) => updateInvestment(id, ch)));
    setDirtyInvestments(new Map());
    qc.invalidateQueries({ queryKey: ['investments'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
    setSaving(false);
  }

  // ── Column definitions ───────────────────────────────────
  const accountColumns = useMemo<ColumnDef<BankAccountResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Bank',
      cell: ({ row }) => (
        <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />
      ),
    },
    { accessorKey: 'customLabel', header: 'Label' },
    { accessorKey: 'accountType', header: 'Type' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--positive">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
  ], []);

  const cardColumns = useMemo<ColumnDef<CreditCardResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Bank',
      cell: ({ row }) => (
        <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />
      ),
    },
    { accessorKey: 'customLabel', header: 'Label' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--negative">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: 'creditLimit',
      header: 'Limit',
      cell: ({ getValue }) => formatCurrency(getValue<number>()),
    },
    {
      accessorKey: 'apr',
      header: 'APR',
      cell: ({ getValue }) => `${getValue<number>().toFixed(2)}%`,
    },
    { accessorKey: 'cardType', header: 'Type' },
  ], []);

  const loanColumns = useMemo<ColumnDef<LoanResponseDto, unknown>[]>(() => [
    { accessorKey: 'customLabel', header: 'Label' },
    { accessorKey: 'lenderName', header: 'Lender' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--negative">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: 'interestRate',
      header: 'Rate',
      cell: ({ getValue }) => `${getValue<number>().toFixed(2)}%`,
    },
    { accessorKey: 'loanType', header: 'Type' },
  ], []);

  const investmentColumns = useMemo<ColumnDef<InvestmentResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Institution',
      cell: ({ row }) => (
        <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />
      ),
    },
    { accessorKey: 'customLabel', header: 'Label' },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--positive">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    { accessorKey: 'ticker', header: 'Ticker' },
    { accessorKey: 'investmentType', header: 'Type' },
  ], []);

  const pendingColumns = useMemo<ColumnDef<PendingItemResponseDto, unknown>[]>(() => [
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return (
          <span className={`acc-amount ${v >= 0 ? 'acc-amount--positive' : 'acc-amount--negative'}`}>
            {formatCurrency(v)}
          </span>
        );
      },
    },
    { accessorKey: 'dueDate', header: 'Due Date' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return <span className={`acc-badge acc-badge--${s.toLowerCase()}`}>{s}</span>;
      },
    },
  ], []);

  // ── Totals ────────────────────────────────────────────────
  const accountTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: (
      <span className="acc-amount acc-amount--positive">
        {formatCurrency(accounts?.reduce((s, a) => s + a.balance, 0) ?? 0)}
      </span>
    ),
  }), [accounts]);

  const cardTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: (
      <span className="acc-amount acc-amount--negative">
        {formatCurrency(cards?.reduce((s, c) => s + c.balance, 0) ?? 0)}
      </span>
    ),
  }), [cards]);

  const loanTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: (
      <span className="acc-amount acc-amount--negative">
        {formatCurrency(loans?.reduce((s, l) => s + l.balance, 0) ?? 0)}
      </span>
    ),
  }), [loans]);

  const investmentTotals = useMemo(() => ({
    customLabel: 'Total',
    currentValue: (
      <span className="acc-amount acc-amount--positive">
        {formatCurrency(investments?.reduce((s, i) => s + i.currentValue, 0) ?? 0)}
      </span>
    ),
  }), [investments]);

  // ── Dirty counts ─────────────────────────────────────────
  const dirtyCount = {
    accounts: dirtyAccounts.size,
    cards: dirtyCards.size,
    loans: dirtyLoans.size,
    investments: dirtyInvestments.size,
  };

  const activeDirtyCount =
    activeTab === 'accounts'    ? dirtyCount.accounts    :
    activeTab === 'cards'       ? dirtyCount.cards        :
    activeTab === 'loans'       ? dirtyCount.loans        :
    activeTab === 'investments' ? dirtyCount.investments  : 0;

  function handleSaveAll() {
    if (activeTab === 'accounts')    return saveAccounts();
    if (activeTab === 'cards')       return saveCards();
    if (activeTab === 'loans')       return saveLoans();
    if (activeTab === 'investments') return saveInvestments();
  }

  function handleDiscard() {
    if (activeTab === 'accounts')    setDirtyAccounts(new Map());
    if (activeTab === 'cards')       setDirtyCards(new Map());
    if (activeTab === 'loans')       setDirtyLoans(new Map());
    if (activeTab === 'investments') setDirtyInvestments(new Map());
  }

  // ── Delete handlers ───────────────────────────────────────
  async function handleDeleteAccount(row: BankAccountResponseDto) {
    if (!confirm(`Delete "${row.customLabel}"?`)) return;
    await deleteAccount(row.id);
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  async function handleSettlePending(row: PendingItemResponseDto) {
    if (row.status === 'Settled') return;
    if (!confirm(`Mark "${row.description}" as settled?`)) return;
    await settlePendingItem(row.id);
    qc.invalidateQueries({ queryKey: ['pending'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="acc-page">
      {/* Page header */}
      <div className="acc-header">
        <h1 className="acc-title">Accounting</h1>
      </div>

      {/* Net worth summary bar */}
      {nw && (
        <div className="acc-summary-bar">
          <div className="acc-summary-item">
            <span className="acc-summary-label">Assets</span>
            <span className="acc-summary-value acc-summary-value--positive">
              {formatCurrency(nw.totalAssets)}
            </span>
          </div>
          <div className="acc-summary-divider" />
          <div className="acc-summary-item">
            <span className="acc-summary-label">Liabilities</span>
            <span className="acc-summary-value acc-summary-value--negative">
              {formatCurrency(nw.totalLiabilities)}
            </span>
          </div>
          <div className="acc-summary-divider" />
          <div className="acc-summary-item">
            <span className="acc-summary-label">Net Worth</span>
            <span className={`acc-summary-value ${nw.liquidNetWorth >= 0 ? 'acc-summary-value--positive' : 'acc-summary-value--negative'}`}>
              {formatCurrency(nw.liquidNetWorth)}
            </span>
          </div>
        </div>
      )}

      {/* Side-tab layout */}
      <div className="acc-layout">
        {/* Side tabs */}
        <nav className="acc-sidetabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`acc-sidetab ${activeTab === t.key ? 'acc-sidetab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {dirtyCount[t.key as keyof typeof dirtyCount] > 0 && (
                <span className="acc-dirty-dot" />
              )}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="acc-panel">
          {/* ── Bank Accounts ── */}
          {activeTab === 'accounts' && (
            <>
              <LedgerTable
                data={accounts ?? []}
                columns={accountColumns}
                getRowVariant={() => 'asset' as RowVariant}
                totals={accountTotals}
                isLoading={loadingAccounts}
                emptyMessage="No bank accounts yet. Add one below."
                onDeleteRow={handleDeleteAccount}
              />
              <BatchSaveBar
                dirtyCount={activeDirtyCount}
                saving={saving}
                onSave={handleSaveAll}
                onDiscard={handleDiscard}
              />
            </>
          )}

          {/* ── Credit Cards ── */}
          {activeTab === 'cards' && (
            <>
              <LedgerTable
                data={cards ?? []}
                columns={cardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                totals={cardTotals}
                isLoading={loadingCards}
                emptyMessage="No credit cards yet."
              />
              <BatchSaveBar
                dirtyCount={activeDirtyCount}
                saving={saving}
                onSave={handleSaveAll}
                onDiscard={handleDiscard}
              />
            </>
          )}

          {/* ── Loans ── */}
          {activeTab === 'loans' && (
            <>
              <LedgerTable
                data={loans ?? []}
                columns={loanColumns}
                getRowVariant={() => 'liability' as RowVariant}
                totals={loanTotals}
                isLoading={loadingLoans}
                emptyMessage="No loans yet."
              />
              <BatchSaveBar
                dirtyCount={activeDirtyCount}
                saving={saving}
                onSave={handleSaveAll}
                onDiscard={handleDiscard}
              />
            </>
          )}

          {/* ── Investments ── */}
          {activeTab === 'investments' && (
            <>
              <LedgerTable
                data={investments ?? []}
                columns={investmentColumns}
                getRowVariant={() => 'asset' as RowVariant}
                totals={investmentTotals}
                isLoading={loadingInvestments}
                emptyMessage="No investments yet."
              />
              <BatchSaveBar
                dirtyCount={activeDirtyCount}
                saving={saving}
                onSave={handleSaveAll}
                onDiscard={handleDiscard}
              />
            </>
          )}

          {/* ── Pending Items ── */}
          {activeTab === 'pending' && (
            <LedgerTable
              data={pending ?? []}
              columns={pendingColumns}
              getRowVariant={(row) => row.amount >= 0 ? 'asset' : 'liability'}
              isLoading={loadingPending}
              emptyMessage="No pending items."
              onEditRow={handleSettlePending}
            />
          )}

          {/* ── Properties ── */}
          {activeTab === 'properties' && (
            <PropertiesPanel
              properties={properties ?? []}
              isLoading={loadingProperties}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── BatchSaveBar ─────────────────────────────────────────────
function BatchSaveBar({
  dirtyCount,
  saving,
  onSave,
  onDiscard,
}: {
  dirtyCount: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (dirtyCount === 0) return null;
  return (
    <div className="acc-batch-bar">
      <span className="acc-batch-info">
        ⚠ {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
      </span>
      <div className="acc-batch-actions">
        <button className="acc-btn acc-btn--ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </button>
        <button className="acc-btn acc-btn--primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save All →'}
        </button>
      </div>
    </div>
  );
}

// ── PropertiesPanel ──────────────────────────────────────────
function PropertiesPanel({
  properties,
  isLoading,
}: {
  properties: PropertyResponseDto[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="acc-props-grid">
        {[1, 2].map((i) => (
          <div key={i} className="acc-prop-card acc-prop-card--skeleton" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="acc-empty">
        <span>No properties saved yet.</span>
      </div>
    );
  }

  return (
    <div className="acc-props-grid">
      {properties.map((p) => (
        <div key={p.id} className="acc-prop-card">
          <div className="acc-prop-address">{p.address}</div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Purchase</span>
            <span>{formatCurrency(p.purchasePrice)}</span>
          </div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Est. Value</span>
            <span>{formatCurrency(p.currentEstimatedValue)}</span>
          </div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Loan</span>
            <span className="acc-amount acc-amount--negative">{formatCurrency(p.loanBalance)}</span>
          </div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Equity</span>
            <span className="acc-amount acc-amount--positive">{formatCurrency(p.equity)}</span>
          </div>
          <div className="acc-prop-divider" />
          <div className="acc-prop-row">
            <span className="acc-prop-label">Rent</span>
            <span>{formatCurrency(p.monthlyRent)}/mo</span>
          </div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Expenses</span>
            <span>{formatCurrency(p.monthlyExpenses)}/mo</span>
          </div>
          <div className="acc-prop-row">
            <span className="acc-prop-label">Cash Flow</span>
            <span className={`acc-amount ${p.monthlyCashFlow >= 0 ? 'acc-amount--positive' : 'acc-amount--negative'}`}>
              {p.monthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(p.monthlyCashFlow)}/mo
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
