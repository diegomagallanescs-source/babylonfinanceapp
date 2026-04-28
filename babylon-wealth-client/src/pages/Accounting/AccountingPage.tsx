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

// ── Bank logo cell ────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────
export function AccountingPage() {
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

  // ── Save handlers ─────────────────────────────────────────
  async function saveAll(
    map: Map<string, unknown>,
    mutateFn: (id: string, ch: unknown) => Promise<unknown>,
    clearFn: () => void,
    queryKeys: string[],
  ) {
    if (map.size === 0) return;
    setSaving(true);
    await Promise.all([...map.entries()].map(([id, ch]) => mutateFn(id, ch)));
    clearFn();
    queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ['networth'] });
    setSaving(false);
  }

  // ── Column definitions ────────────────────────────────────
  const accountColumns = useMemo<ColumnDef<BankAccountResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Bank',
      cell: ({ row }) => <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />,
    },
    { accessorKey: 'customLabel', header: 'Label' },
    { accessorKey: 'accountType', header: 'Type' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--positive">{formatCurrency(getValue<number>())}</span>
      ),
    },
  ], []);

  const businessCardColumns = useMemo<ColumnDef<CreditCardResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Card',
      cell: ({ row }) => <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />,
    },
    { accessorKey: 'customLabel', header: 'Label' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--negative">{formatCurrency(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'apr',
      header: 'APR',
      cell: ({ getValue }) => `${(getValue<number>() * 100).toFixed(0)}%`,
    },
    {
      accessorKey: 'creditLimit',
      header: 'Credit Limit',
      cell: ({ getValue }) => formatCurrency(getValue<number>()),
    },
  ], []);

  const loanColumns = useMemo<ColumnDef<LoanResponseDto, unknown>[]>(() => [
    { accessorKey: 'customLabel', header: 'Label' },
    { accessorKey: 'lenderName', header: 'Lender' },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--negative">-{formatCurrency(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'interestRate',
      header: 'Rate',
      cell: ({ getValue }) => `${(getValue<number>() * 100).toFixed(2)}%`,
    },
    { accessorKey: 'loanType', header: 'Type' },
  ], []);

  const investmentColumns = useMemo<ColumnDef<InvestmentResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'bankName',
      header: 'Institution',
      cell: ({ row }) => <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />,
    },
    { accessorKey: 'customLabel', header: 'Label' },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ getValue }) => (
        <span className="acc-amount acc-amount--positive">{formatCurrency(getValue<number>())}</span>
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

  // ── Split cards by type ───────────────────────────────────
  const businessCards = useMemo(() => cards?.filter((c) => c.cardType === 'Business') ?? [], [cards]);
  const personalCards = useMemo(() => cards?.filter((c) => c.cardType === 'Personal') ?? [], [cards]);

  // ── Totals ────────────────────────────────────────────────
  const accountTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--positive">{formatCurrency(accounts?.reduce((s, a) => s + a.balance, 0) ?? 0)}</span>,
  }), [accounts]);

  const bizCardTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">{formatCurrency(businessCards.reduce((s, c) => s + c.balance, 0))}</span>,
    creditLimit: formatCurrency(businessCards.reduce((s, c) => s + c.creditLimit, 0)),
  }), [businessCards]);

  const persCardTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">{formatCurrency(personalCards.reduce((s, c) => s + c.balance, 0))}</span>,
    creditLimit: formatCurrency(personalCards.reduce((s, c) => s + c.creditLimit, 0)),
  }), [personalCards]);

  const loanTotals = useMemo(() => ({
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">-{formatCurrency(loans?.reduce((s, l) => s + l.balance, 0) ?? 0)}</span>,
  }), [loans]);

  const investmentTotals = useMemo(() => ({
    customLabel: 'Total',
    currentValue: <span className="acc-amount acc-amount--positive">{formatCurrency(investments?.reduce((s, i) => s + i.currentValue, 0) ?? 0)}</span>,
  }), [investments]);

  // ── Delete / settle handlers ──────────────────────────────
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
      <div className="acc-header">
        <h1 className="acc-title">Accounting</h1>
      </div>

      {/* NW summary bar */}
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

      {/* All sections visible at once — Excel-style scroll */}
      <div className="acc-sections">

        {/* ── Bank Accounts ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Bank Accounts</span>
          </div>
          <LedgerTable
            data={accounts ?? []}
            columns={accountColumns}
            getRowVariant={() => 'asset' as RowVariant}
            totals={accountTotals}
            isLoading={loadingAccounts}
            emptyMessage="No bank accounts yet."
            onDeleteRow={handleDeleteAccount}
          />
          {dirtyAccounts.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyAccounts.size}
              saving={saving}
              onSave={() => saveAll(dirtyAccounts as Map<string, unknown>, updateAccount as (id: string, ch: unknown) => Promise<unknown>, () => setDirtyAccounts(new Map()), ['accounts'])}
              onDiscard={() => setDirtyAccounts(new Map())}
            />
          )}
        </div>

        {/* ── Credit Cards — Business / Personal side by side ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Credit Cards</span>
          </div>
          <div className="acc-section-tables">
            <div className="acc-section">
              <span className="acc-section-title" style={{ fontSize: 11 }}>Business Cards</span>
              <LedgerTable
                data={businessCards}
                columns={businessCardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                totals={bizCardTotals}
                isLoading={loadingCards}
                emptyMessage="No business cards."
              />
            </div>
            <div className="acc-section">
              <span className="acc-section-title" style={{ fontSize: 11 }}>Personal Cards</span>
              <LedgerTable
                data={personalCards}
                columns={businessCardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                totals={persCardTotals}
                isLoading={loadingCards}
                emptyMessage="No personal cards."
              />
            </div>
          </div>
          {dirtyCards.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyCards.size}
              saving={saving}
              onSave={() => saveAll(dirtyCards as Map<string, unknown>, updateCreditCard as (id: string, ch: unknown) => Promise<unknown>, () => setDirtyCards(new Map()), ['creditcards'])}
              onDiscard={() => setDirtyCards(new Map())}
            />
          )}
        </div>

        {/* ── Loans ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Loans</span>
          </div>
          <LedgerTable
            data={loans ?? []}
            columns={loanColumns}
            getRowVariant={() => 'liability' as RowVariant}
            totals={loanTotals}
            isLoading={loadingLoans}
            emptyMessage="No loans."
          />
          {dirtyLoans.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyLoans.size}
              saving={saving}
              onSave={() => saveAll(dirtyLoans as Map<string, unknown>, updateLoan as (id: string, ch: unknown) => Promise<unknown>, () => setDirtyLoans(new Map()), ['loans'])}
              onDiscard={() => setDirtyLoans(new Map())}
            />
          )}
        </div>

        {/* ── Investments ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Investments</span>
          </div>
          <LedgerTable
            data={investments ?? []}
            columns={investmentColumns}
            getRowVariant={() => 'asset' as RowVariant}
            totals={investmentTotals}
            isLoading={loadingInvestments}
            emptyMessage="No investments."
          />
          {dirtyInvestments.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyInvestments.size}
              saving={saving}
              onSave={() => saveAll(dirtyInvestments as Map<string, unknown>, updateInvestment as (id: string, ch: unknown) => Promise<unknown>, () => setDirtyInvestments(new Map()), ['investments'])}
              onDiscard={() => setDirtyInvestments(new Map())}
            />
          )}
        </div>

        {/* ── Pending Items ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Pending Items</span>
          </div>
          <LedgerTable
            data={pending ?? []}
            columns={pendingColumns}
            getRowVariant={(row) => row.amount >= 0 ? 'asset' : 'liability'}
            isLoading={loadingPending}
            emptyMessage="No pending items."
            onEditRow={handleSettlePending}
          />
        </div>

        {/* ── Properties ── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Properties</span>
          </div>
          <PropertiesPanel properties={properties ?? []} isLoading={loadingProperties} />
        </div>

      </div>
    </div>
  );
}

// ── BatchSaveBar ──────────────────────────────────────────────
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

// ── PropertiesPanel ───────────────────────────────────────────
function PropertiesPanel({ properties, isLoading }: { properties: PropertyResponseDto[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="acc-props-grid">
        {[1, 2].map((i) => <div key={i} className="acc-prop-card acc-prop-card--skeleton" />)}
      </div>
    );
  }
  if (properties.length === 0) {
    return <div className="acc-empty">No properties saved yet.</div>;
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
