import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';

import { useNetWorth } from '../../hooks/useNetWorth';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useLoans } from '../../hooks/useLoans';
import { useInvestments } from '../../hooks/useInvestments';
import { usePendingItems } from '../../hooks/usePendingItems';
import { useProperties } from '../../hooks/useProperties';
import { useBudgetCategories } from '../../hooks/useBudgetCategories';

import {
  createAccount, updateAccount, deleteAccount,
  createCreditCard, updateCreditCard,
  createLoan, updateLoan,
  createInvestment, updateInvestment,
  settlePendingItem,
} from '../../api/ledger';

import { LedgerTable, type RowVariant } from '../../components/LedgerTable';
import { BankSearchInput } from '../../components/BankSearchInput';

import type {
  BankDto,
  BankAccountResponseDto, CreateBankAccountRequest, UpdateBankAccountRequest,
  CreditCardResponseDto, CreateCreditCardRequest, UpdateCreditCardRequest,
  LoanResponseDto, CreateLoanRequest, UpdateLoanRequest,
  InvestmentResponseDto, CreateInvestmentRequest, UpdateInvestmentRequest,
  PendingItemResponseDto,
  PropertyResponseDto,
  BudgetCategoryResponseDto,
} from '../../types/ledger';

import { formatCurrency } from '../../utils/format';
import './AccountingPage.css';

// ── Constants ─────────────────────────────────────────────────
const ACCT_TYPES = ['Checking', 'Savings', 'Money Market', 'CD', 'Other'];
const LOAN_TYPES = ['Mortgage', 'Auto', 'Student', 'Personal', 'HELOC', 'Business', 'Other'];
const INVESTMENT_TYPES = ['Brokerage', '401k', 'IRA', 'Roth IRA', 'HSA', 'Crypto', 'Other'];

// ── Small display helpers ─────────────────────────────────────
function BankCell({ logoUrl, name }: { logoUrl: string | null; name: string | null }) {
  const label = name ?? '—';
  return (
    <div className="lt__bank-cell">
      {logoUrl
        ? <img className="lt__bank-logo" src={logoUrl} alt={label} />
        : <span className="lt__bank-logo-placeholder">{label[0]?.toUpperCase() ?? '?'}</span>
      }
      <span>{label}</span>
    </div>
  );
}

function CategoryPill({ cat }: { cat: BudgetCategoryResponseDto | undefined }) {
  if (!cat) return <span className="acc-category-pill acc-category-pill--none">—</span>;
  return (
    <span
      className="acc-category-pill"
      style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '55' }}
    >
      {cat.name}
    </span>
  );
}

function UtilBadge({ balance, limit }: { balance: number; limit: number }) {
  if (!limit) return <span className="acc-util acc-util--none">—</span>;
  const pct = (balance / limit) * 100;
  const cls = pct < 30 ? 'acc-util--low' : pct < 60 ? 'acc-util--mid' : 'acc-util--high';
  return <span className={`acc-util ${cls}`}>{pct.toFixed(1)}%</span>;
}

// ── BatchSaveBar ──────────────────────────────────────────────
function BatchSaveBar({
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

// ── Main page ─────────────────────────────────────────────────
export function AccountingPage() {
  const qc = useQueryClient();

  const { data: nw } = useNetWorth();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: cards, isLoading: loadingCards } = useCreditCards();
  const { data: loans, isLoading: loadingLoans } = useLoans();
  const { data: investments, isLoading: loadingInvestments } = useInvestments();
  const { data: pending, isLoading: loadingPending } = usePendingItems();
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const { data: categories = [] } = useBudgetCategories();

  const [saving, setSaving] = useState(false);

  // ── Bank Accounts ─────────────────────────────────────────
  const [dirtyAccounts, setDirtyAccounts] = useState<Map<string, UpdateBankAccountRequest>>(new Map());
  const [acctEditId, setAcctEditId] = useState<string | null>(null);
  const [acctDraft, setAcctDraft] = useState<Partial<UpdateBankAccountRequest>>({});
  const [acctEditBank, setAcctEditBank] = useState<BankDto | null>(null);

  const [showAddAcct, setShowAddAcct] = useState(false);
  const [addAcctForm, setAddAcctForm] = useState<CreateBankAccountRequest>({
    customLabel: '', balance: 0, accountType: 'Checking', bankId: null, budgetCategoryId: null,
  });
  const [addAcctBank, setAddAcctBank] = useState<BankDto | null>(null);
  const [addingAcct, setAddingAcct] = useState(false);

  function startAcctEdit(row: BankAccountResponseDto) {
    setAcctEditId(row.id);
    setAcctDraft({
      customLabel: row.customLabel,
      balance: row.balance,
      accountType: row.accountType,
      bankId: row.bankId,
      budgetCategoryId: row.budgetCategoryId,
    });
    setAcctEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyAcctEdit(row: BankAccountResponseDto) {
    const update: UpdateBankAccountRequest = {
      customLabel: acctDraft.customLabel ?? row.customLabel,
      balance: acctDraft.balance ?? row.balance,
      accountType: acctDraft.accountType ?? row.accountType,
      bankId: 'bankId' in acctDraft ? acctDraft.bankId : row.bankId,
      budgetCategoryId: 'budgetCategoryId' in acctDraft ? acctDraft.budgetCategoryId : row.budgetCategoryId,
    };
    setDirtyAccounts((prev) => new Map(prev).set(row.id, update));
    setAcctEditId(null);
    setAcctDraft({});
    setAcctEditBank(null);
  }

  function cancelAcctEdit() {
    setAcctEditId(null);
    setAcctDraft({});
    setAcctEditBank(null);
  }

  async function handleDeleteAccount(row: BankAccountResponseDto) {
    if (!confirm(`Delete "${row.customLabel}"?`)) return;
    await deleteAccount(row.id);
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  async function handleAddAccount() {
    if (!addAcctForm.customLabel.trim()) return;
    setAddingAcct(true);
    try {
      await createAccount({ ...addAcctForm, bankId: addAcctBank?.id ?? null });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddAcctForm({ customLabel: '', balance: 0, accountType: 'Checking', bankId: null, budgetCategoryId: null });
      setAddAcctBank(null);
      setShowAddAcct(false);
    } finally {
      setAddingAcct(false);
    }
  }

  // ── Credit Cards ──────────────────────────────────────────
  const [dirtyCards, setDirtyCards] = useState<Map<string, UpdateCreditCardRequest>>(new Map());
  const [cardEditId, setCardEditId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<Partial<UpdateCreditCardRequest>>({});
  const [cardEditBank, setCardEditBank] = useState<BankDto | null>(null);

  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardForm, setAddCardForm] = useState<CreateCreditCardRequest>({
    customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal', bankId: null,
  });
  const [addCardBank, setAddCardBank] = useState<BankDto | null>(null);
  const [addingCard, setAddingCard] = useState(false);

  function startCardEdit(row: CreditCardResponseDto) {
    setCardEditId(row.id);
    setCardDraft({
      customLabel: row.customLabel,
      balance: row.balance,
      creditLimit: row.creditLimit,
      apr: row.apr,
      bankId: row.bankId,
    });
    setCardEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyCardEdit(row: CreditCardResponseDto) {
    const update: UpdateCreditCardRequest = {
      customLabel: cardDraft.customLabel ?? row.customLabel,
      balance: cardDraft.balance ?? row.balance,
      creditLimit: cardDraft.creditLimit ?? row.creditLimit,
      apr: cardDraft.apr ?? row.apr,
      bankId: 'bankId' in cardDraft ? cardDraft.bankId : row.bankId,
    };
    setDirtyCards((prev) => new Map(prev).set(row.id, update));
    setCardEditId(null);
    setCardDraft({});
    setCardEditBank(null);
  }

  function cancelCardEdit() {
    setCardEditId(null);
    setCardDraft({});
    setCardEditBank(null);
  }

  async function handleAddCard() {
    if (!addCardForm.customLabel.trim()) return;
    setAddingCard(true);
    try {
      await createCreditCard({ ...addCardForm, bankId: addCardBank?.id ?? null });
      qc.invalidateQueries({ queryKey: ['creditcards'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddCardForm({ customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal', bankId: null });
      setAddCardBank(null);
      setShowAddCard(false);
    } finally {
      setAddingCard(false);
    }
  }

  // ── Loans ─────────────────────────────────────────────────
  const [dirtyLoans, setDirtyLoans] = useState<Map<string, UpdateLoanRequest>>(new Map());
  const [loanEditId, setLoanEditId] = useState<string | null>(null);
  const [loanDraft, setLoanDraft] = useState<Partial<UpdateLoanRequest>>({});

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addLoanForm, setAddLoanForm] = useState<CreateLoanRequest>({
    customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage',
  });
  const [addingLoan, setAddingLoan] = useState(false);

  function startLoanEdit(row: LoanResponseDto) {
    setLoanEditId(row.id);
    setLoanDraft({
      customLabel: row.customLabel,
      lenderName: row.lenderName,
      balance: row.balance,
      interestRate: row.interestRate,
      loanType: row.loanType,
    });
  }

  function applyLoanEdit(row: LoanResponseDto) {
    const update: UpdateLoanRequest = {
      customLabel: loanDraft.customLabel ?? row.customLabel,
      lenderName: loanDraft.lenderName ?? row.lenderName,
      balance: loanDraft.balance ?? row.balance,
      interestRate: loanDraft.interestRate ?? row.interestRate,
      loanType: loanDraft.loanType ?? row.loanType,
    };
    setDirtyLoans((prev) => new Map(prev).set(row.id, update));
    setLoanEditId(null);
    setLoanDraft({});
  }

  function cancelLoanEdit() {
    setLoanEditId(null);
    setLoanDraft({});
  }

  async function handleAddLoan() {
    if (!addLoanForm.customLabel.trim()) return;
    setAddingLoan(true);
    try {
      await createLoan(addLoanForm);
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddLoanForm({ customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage' });
      setShowAddLoan(false);
    } finally {
      setAddingLoan(false);
    }
  }

  // ── Investments ───────────────────────────────────────────
  const [dirtyInvestments, setDirtyInvestments] = useState<Map<string, UpdateInvestmentRequest>>(new Map());
  const [investEditId, setInvestEditId] = useState<string | null>(null);
  const [investDraft, setInvestDraft] = useState<Partial<UpdateInvestmentRequest>>({});
  const [investEditBank, setInvestEditBank] = useState<BankDto | null>(null);

  const [showAddInvest, setShowAddInvest] = useState(false);
  const [addInvestForm, setAddInvestForm] = useState<CreateInvestmentRequest>({
    customLabel: '', currentValue: 0, investmentType: 'Brokerage', bankId: null, ticker: null,
  });
  const [addInvestBank, setAddInvestBank] = useState<BankDto | null>(null);
  const [addingInvest, setAddingInvest] = useState(false);

  function startInvestEdit(row: InvestmentResponseDto) {
    setInvestEditId(row.id);
    setInvestDraft({
      customLabel: row.customLabel,
      currentValue: row.currentValue,
      investmentType: row.investmentType,
      ticker: row.ticker,
      bankId: row.bankId,
    });
    setInvestEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyInvestEdit(row: InvestmentResponseDto) {
    const update: UpdateInvestmentRequest = {
      customLabel: investDraft.customLabel ?? row.customLabel,
      currentValue: investDraft.currentValue ?? row.currentValue,
      investmentType: investDraft.investmentType ?? row.investmentType,
      ticker: 'ticker' in investDraft ? investDraft.ticker : row.ticker,
      bankId: 'bankId' in investDraft ? investDraft.bankId : row.bankId,
    };
    setDirtyInvestments((prev) => new Map(prev).set(row.id, update));
    setInvestEditId(null);
    setInvestDraft({});
    setInvestEditBank(null);
  }

  function cancelInvestEdit() {
    setInvestEditId(null);
    setInvestDraft({});
    setInvestEditBank(null);
  }

  async function handleAddInvestment() {
    if (!addInvestForm.customLabel.trim()) return;
    setAddingInvest(true);
    try {
      await createInvestment({ ...addInvestForm, bankId: addInvestBank?.id ?? null });
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddInvestForm({ customLabel: '', currentValue: 0, investmentType: 'Brokerage', bankId: null, ticker: null });
      setAddInvestBank(null);
      setShowAddInvest(false);
    } finally {
      setAddingInvest(false);
    }
  }

  // ── Generic batch save ────────────────────────────────────
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

  // ── Account columns (inline editing) ─────────────────────
  const accountColumns: ColumnDef<BankAccountResponseDto, unknown>[] = [
    {
      id: 'bank',
      header: 'Bank',
      accessorKey: 'bankName',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <BankSearchInput
              value={acctEditBank}
              onChange={(bank) => {
                setAcctEditBank(bank);
                setAcctDraft((d) => ({ ...d, bankId: bank?.id ?? null }));
              }}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--wide"
              value={acctDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setAcctDraft((d) => ({ ...d, customLabel: e.target.value }))}
            />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'accountType',
      header: 'Type',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <select
              className="lt__edit-select"
              value={acctDraft.accountType ?? row.original.accountType}
              onChange={(e) => setAcctDraft((d) => ({ ...d, accountType: e.target.value }))}
            >
              {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.accountType;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--number"
              type="number"
              step="0.01"
              value={acctDraft.balance ?? row.original.balance}
              onChange={(e) => setAcctDraft((d) => ({ ...d, balance: Number(e.target.value) }))}
            />
          );
        }
        return <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.balance)}</span>;
      },
    },
    {
      id: 'budgetCategory',
      header: 'Category',
      accessorKey: 'budgetCategoryId',
      enableSorting: false,
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <select
              className="lt__edit-select"
              value={acctDraft.budgetCategoryId ?? row.original.budgetCategoryId ?? ''}
              onChange={(e) => setAcctDraft((d) => ({ ...d, budgetCategoryId: e.target.value || null }))}
            >
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          );
        }
        const cat = categories.find((c) => c.id === row.original.budgetCategoryId);
        return <CategoryPill cat={cat} />;
      },
    },
    {
      id: '_actions',
      header: '',
      enableSorting: false,
      size: 140,
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <div className="lt__actions">
              <button className="lt__action-btn lt__action-btn--apply" type="button"
                onClick={() => applyAcctEdit(row.original)}>Apply</button>
              <button className="lt__action-btn lt__action-btn--cancel" type="button"
                onClick={cancelAcctEdit}>Cancel</button>
            </div>
          );
        }
        const isDirty = dirtyAccounts.has(row.original.id);
        return (
          <div className="lt__actions">
            {isDirty && <span className="lt__dirty-dot" title="Unsaved changes" />}
            <button className="lt__action-btn lt__action-btn--edit" type="button"
              onClick={() => startAcctEdit(row.original)}>Edit</button>
            <button className="lt__action-btn lt__action-btn--delete" type="button"
              onClick={() => handleDeleteAccount(row.original)}>Delete</button>
          </div>
        );
      },
    },
  ];

  // ── Credit card columns (inline editing) ─────────────────
  const cardColumns: ColumnDef<CreditCardResponseDto, unknown>[] = [
    {
      id: 'bank',
      header: 'Bank',
      accessorKey: 'bankName',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <BankSearchInput
              value={cardEditBank}
              onChange={(bank) => {
                setCardEditBank(bank);
                setCardDraft((d) => ({ ...d, bankId: bank?.id ?? null }));
              }}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--wide"
              value={cardDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setCardDraft((d) => ({ ...d, customLabel: e.target.value }))}
            />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--number"
              type="number"
              step="0.01"
              value={cardDraft.balance ?? row.original.balance}
              onChange={(e) => setCardDraft((d) => ({ ...d, balance: Number(e.target.value) }))}
            />
          );
        }
        return <span className="acc-amount acc-amount--negative">{formatCurrency(row.original.balance)}</span>;
      },
    },
    {
      accessorKey: 'creditLimit',
      header: 'Limit',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--number"
              type="number"
              step="0.01"
              value={cardDraft.creditLimit ?? row.original.creditLimit}
              onChange={(e) => setCardDraft((d) => ({ ...d, creditLimit: Number(e.target.value) }))}
            />
          );
        }
        return formatCurrency(row.original.creditLimit);
      },
    },
    {
      accessorKey: 'apr',
      header: 'APR',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              className="lt__edit-input lt__edit-input--number"
              type="number"
              step="0.01"
              placeholder="%"
              style={{ maxWidth: 72 }}
              value={Number(((cardDraft.apr ?? row.original.apr) * 100).toFixed(2))}
              onChange={(e) => setCardDraft((d) => ({ ...d, apr: Number(e.target.value) / 100 }))}
            />
          );
        }
        return `${(row.original.apr * 100).toFixed(0)}%`;
      },
    },
    {
      id: 'utilization',
      header: 'Util %',
      enableSorting: false,
      cell: ({ row }) => (
        <UtilBadge balance={row.original.balance} limit={row.original.creditLimit} />
      ),
    },
    {
      id: '_actions',
      header: '',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <div className="lt__actions">
              <button className="lt__action-btn lt__action-btn--apply" type="button"
                onClick={() => applyCardEdit(row.original)}>Apply</button>
              <button className="lt__action-btn lt__action-btn--cancel" type="button"
                onClick={cancelCardEdit}>Cancel</button>
            </div>
          );
        }
        const isDirty = dirtyCards.has(row.original.id);
        return (
          <div className="lt__actions">
            {isDirty && <span className="lt__dirty-dot" title="Unsaved changes" />}
            <button className="lt__action-btn lt__action-btn--edit" type="button"
              onClick={() => startCardEdit(row.original)}>Edit</button>
          </div>
        );
      },
    },
  ];

  // ── Loan columns (inline editing) ────────────────────────
  const loanColumns: ColumnDef<LoanResponseDto, unknown>[] = [
    {
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--wide"
              value={loanDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setLoanDraft((d) => ({ ...d, customLabel: e.target.value }))} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'lenderName',
      header: 'Lender',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--wide"
              value={loanDraft.lenderName ?? row.original.lenderName}
              onChange={(e) => setLoanDraft((d) => ({ ...d, lenderName: e.target.value }))} />
          );
        }
        return row.original.lenderName;
      },
    },
    {
      accessorKey: 'loanType',
      header: 'Type',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <select className="lt__edit-select"
              value={loanDraft.loanType ?? row.original.loanType}
              onChange={(e) => setLoanDraft((d) => ({ ...d, loanType: e.target.value }))}>
              {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.loanType;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--number" type="number" step="0.01" min="0"
              value={loanDraft.balance ?? row.original.balance}
              onChange={(e) => setLoanDraft((d) => ({ ...d, balance: Number(e.target.value) }))} />
          );
        }
        return <span className="acc-amount acc-amount--negative">-{formatCurrency(row.original.balance)}</span>;
      },
    },
    {
      accessorKey: 'interestRate',
      header: 'Rate',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--number" type="number" step="0.01" min="0"
              style={{ maxWidth: 72 }}
              value={Number(((loanDraft.interestRate ?? row.original.interestRate) * 100).toFixed(3))}
              onChange={(e) => setLoanDraft((d) => ({ ...d, interestRate: Number(e.target.value) / 100 }))} />
          );
        }
        return `${(row.original.interestRate * 100).toFixed(2)}%`;
      },
    },
    {
      id: '_actions',
      header: '',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <div className="lt__actions">
              <button className="lt__action-btn lt__action-btn--apply" type="button"
                onClick={() => applyLoanEdit(row.original)}>Apply</button>
              <button className="lt__action-btn lt__action-btn--cancel" type="button"
                onClick={cancelLoanEdit}>Cancel</button>
            </div>
          );
        }
        const isDirty = dirtyLoans.has(row.original.id);
        return (
          <div className="lt__actions">
            {isDirty && <span className="lt__dirty-dot" title="Unsaved changes" />}
            <button className="lt__action-btn lt__action-btn--edit" type="button"
              onClick={() => startLoanEdit(row.original)}>Edit</button>
          </div>
        );
      },
    },
  ];

  // ── Investment columns (inline editing) ──────────────────
  const investmentColumns: ColumnDef<InvestmentResponseDto, unknown>[] = [
    {
      id: 'bank',
      header: 'Institution',
      accessorKey: 'bankName',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <BankSearchInput
              value={investEditBank}
              onChange={(bank) => {
                setInvestEditBank(bank);
                setInvestDraft((d) => ({ ...d, bankId: bank?.id ?? null }));
              }}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--wide"
              value={investDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setInvestDraft((d) => ({ ...d, customLabel: e.target.value }))} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'investmentType',
      header: 'Type',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <select className="lt__edit-select"
              value={investDraft.investmentType ?? row.original.investmentType}
              onChange={(e) => setInvestDraft((d) => ({ ...d, investmentType: e.target.value }))}>
              {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.investmentType;
      },
    },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input className="lt__edit-input lt__edit-input--number" type="number" step="0.01" min="0"
              value={investDraft.currentValue ?? row.original.currentValue}
              onChange={(e) => setInvestDraft((d) => ({ ...d, currentValue: Number(e.target.value) }))} />
          );
        }
        return <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.currentValue)}</span>;
      },
    },
    {
      accessorKey: 'ticker',
      header: 'Ticker',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input className="lt__edit-input"
              style={{ maxWidth: 80, textTransform: 'uppercase' }}
              value={investDraft.ticker ?? row.original.ticker ?? ''}
              placeholder="e.g. VTI"
              onChange={(e) => setInvestDraft((d) => ({ ...d, ticker: e.target.value || null }))} />
          );
        }
        return row.original.ticker
          ? <span className="acc-ticker">{row.original.ticker}</span>
          : <span className="acc-amount" style={{ opacity: 0.4 }}>—</span>;
      },
    },
    {
      id: '_actions',
      header: '',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <div className="lt__actions">
              <button className="lt__action-btn lt__action-btn--apply" type="button"
                onClick={() => applyInvestEdit(row.original)}>Apply</button>
              <button className="lt__action-btn lt__action-btn--cancel" type="button"
                onClick={cancelInvestEdit}>Cancel</button>
            </div>
          );
        }
        const isDirty = dirtyInvestments.has(row.original.id);
        return (
          <div className="lt__actions">
            {isDirty && <span className="lt__dirty-dot" title="Unsaved changes" />}
            <button className="lt__action-btn lt__action-btn--edit" type="button"
              onClick={() => startInvestEdit(row.original)}>Edit</button>
          </div>
        );
      },
    },
  ];

  // ── Pending columns ───────────────────────────────────────
  const pendingColumns: ColumnDef<PendingItemResponseDto, unknown>[] = [
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
  ];

  // ── Splits + totals ───────────────────────────────────────
  const businessCards = (cards ?? []).filter((c) => c.cardType === 'Business');
  const personalCards = (cards ?? []).filter((c) => c.cardType === 'Personal');

  const accountTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--positive">{formatCurrency((accounts ?? []).reduce((s, a) => s + a.balance, 0))}</span>,
  };
  const bizCardTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">{formatCurrency(businessCards.reduce((s, c) => s + c.balance, 0))}</span>,
    creditLimit: formatCurrency(businessCards.reduce((s, c) => s + c.creditLimit, 0)),
  };
  const persCardTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">{formatCurrency(personalCards.reduce((s, c) => s + c.balance, 0))}</span>,
    creditLimit: formatCurrency(personalCards.reduce((s, c) => s + c.creditLimit, 0)),
  };
  const loanTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">-{formatCurrency((loans ?? []).reduce((s, l) => s + l.balance, 0))}</span>,
  };
  const investmentTotals = {
    customLabel: 'Total',
    currentValue: <span className="acc-amount acc-amount--positive">{formatCurrency((investments ?? []).reduce((s, i) => s + i.currentValue, 0))}</span>,
  };

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

      {nw && (
        <div className="acc-summary-bar">
          <div className="acc-summary-item">
            <span className="acc-summary-label">Assets</span>
            <span className="acc-summary-value acc-summary-value--positive">{formatCurrency(nw.totalAssets)}</span>
          </div>
          <div className="acc-summary-divider" />
          <div className="acc-summary-item">
            <span className="acc-summary-label">Liabilities</span>
            <span className="acc-summary-value acc-summary-value--negative">{formatCurrency(nw.totalLiabilities)}</span>
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

      <div className="acc-sections">

        {/* ── Bank Accounts ──────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Bank Accounts</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddAcct((v) => !v)}>
              {showAddAcct ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={accounts ?? []}
            columns={accountColumns}
            getRowVariant={() => 'asset' as RowVariant}
            getRowClass={(row) => dirtyAccounts.has(row.id) ? 'lt__row--dirty' : ''}
            totals={accountTotals}
            isLoading={loadingAccounts}
            emptyMessage="No bank accounts yet."
          />
          {showAddAcct && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput
                  value={addAcctBank}
                  onChange={(b) => { setAddAcctBank(b); setAddAcctForm((f) => ({ ...f, bankId: b?.id ?? null })); }}
                  placeholder="Bank (optional)"
                />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Label *"
                  value={addAcctForm.customLabel}
                  onChange={(e) => setAddAcctForm((f) => ({ ...f, customLabel: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addAcctForm.accountType}
                  onChange={(e) => setAddAcctForm((f) => ({ ...f, accountType: e.target.value }))}>
                  {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Balance ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addAcctForm.balance === 0 ? '' : addAcctForm.balance}
                  placeholder="0.00"
                  onChange={(e) => setAddAcctForm((f) => ({ ...f, balance: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addAcctForm.budgetCategoryId ?? ''}
                  onChange={(e) => setAddAcctForm((f) => ({ ...f, budgetCategoryId: e.target.value || null }))}>
                  <option value="">Category (optional)</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddAccount} disabled={addingAcct}>
                  {addingAcct ? 'Adding…' : 'Add Account'}
                </button>
              </label>
            </div>
          )}
          {dirtyAccounts.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyAccounts.size}
              saving={saving}
              onSave={() => saveAll(
                dirtyAccounts as Map<string, unknown>,
                updateAccount as (id: string, ch: unknown) => Promise<unknown>,
                () => setDirtyAccounts(new Map()),
                ['accounts'],
              )}
              onDiscard={() => { setDirtyAccounts(new Map()); cancelAcctEdit(); }}
            />
          )}
        </div>

        {/* ── Credit Cards ──────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Credit Cards</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddCard((v) => !v)}>
              {showAddCard ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <div className="acc-section-tables">
            <div className="acc-section">
              <span className="acc-section-title acc-section-title--sub">Business</span>
              <LedgerTable
                data={businessCards}
                columns={cardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                getRowClass={(row) => dirtyCards.has(row.id) ? 'lt__row--dirty' : ''}
                totals={bizCardTotals}
                isLoading={loadingCards}
                emptyMessage="No business cards."
              />
            </div>
            <div className="acc-section">
              <span className="acc-section-title acc-section-title--sub">Personal</span>
              <LedgerTable
                data={personalCards}
                columns={cardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                getRowClass={(row) => dirtyCards.has(row.id) ? 'lt__row--dirty' : ''}
                totals={persCardTotals}
                isLoading={loadingCards}
                emptyMessage="No personal cards."
              />
            </div>
          </div>
          {showAddCard && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput
                  value={addCardBank}
                  onChange={(b) => { setAddCardBank(b); setAddCardForm((f) => ({ ...f, bankId: b?.id ?? null })); }}
                  placeholder="Bank (optional)"
                />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Label *"
                  value={addCardForm.customLabel}
                  onChange={(e) => setAddCardForm((f) => ({ ...f, customLabel: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addCardForm.cardType}
                  onChange={(e) => setAddCardForm((f) => ({ ...f, cardType: e.target.value }))}>
                  <option value="Personal">Personal</option>
                  <option value="Business">Business</option>
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Balance ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addCardForm.balance === 0 ? '' : addCardForm.balance}
                  placeholder="0.00"
                  onChange={(e) => setAddCardForm((f) => ({ ...f, balance: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Credit Limit ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addCardForm.creditLimit === 0 ? '' : addCardForm.creditLimit}
                  placeholder="0.00"
                  onChange={(e) => setAddCardForm((f) => ({ ...f, creditLimit: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">APR (%)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addCardForm.apr === 0 ? '' : Number((addCardForm.apr * 100).toFixed(2))}
                  placeholder="0.00"
                  onChange={(e) => setAddCardForm((f) => ({ ...f, apr: Number(e.target.value) / 100 }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddCard} disabled={addingCard}>
                  {addingCard ? 'Adding…' : 'Add Card'}
                </button>
              </label>
            </div>
          )}
          {dirtyCards.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyCards.size}
              saving={saving}
              onSave={() => saveAll(
                dirtyCards as Map<string, unknown>,
                updateCreditCard as (id: string, ch: unknown) => Promise<unknown>,
                () => setDirtyCards(new Map()),
                ['creditcards'],
              )}
              onDiscard={() => { setDirtyCards(new Map()); cancelCardEdit(); }}
            />
          )}
        </div>

        {/* ── Loans ─────────────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Loans</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddLoan((v) => !v)}>
              {showAddLoan ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={loans ?? []}
            columns={loanColumns}
            getRowVariant={() => 'liability' as RowVariant}
            getRowClass={(row) => dirtyLoans.has(row.id) ? 'lt__row--dirty' : ''}
            totals={loanTotals}
            isLoading={loadingLoans}
            emptyMessage="No loans."
          />
          {showAddLoan && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Label *"
                  value={addLoanForm.customLabel}
                  onChange={(e) => setAddLoanForm((f) => ({ ...f, customLabel: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Lender"
                  value={addLoanForm.lenderName}
                  onChange={(e) => setAddLoanForm((f) => ({ ...f, lenderName: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addLoanForm.loanType}
                  onChange={(e) => setAddLoanForm((f) => ({ ...f, loanType: e.target.value }))}>
                  {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Balance ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addLoanForm.balance === 0 ? '' : addLoanForm.balance}
                  placeholder="0.00"
                  onChange={(e) => setAddLoanForm((f) => ({ ...f, balance: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Rate (%)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addLoanForm.interestRate === 0 ? '' : Number((addLoanForm.interestRate * 100).toFixed(3))}
                  placeholder="0.00"
                  onChange={(e) => setAddLoanForm((f) => ({ ...f, interestRate: Number(e.target.value) / 100 }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddLoan} disabled={addingLoan}>
                  {addingLoan ? 'Adding…' : 'Add Loan'}
                </button>
              </label>
            </div>
          )}
          {dirtyLoans.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyLoans.size}
              saving={saving}
              onSave={() => saveAll(
                dirtyLoans as Map<string, unknown>,
                updateLoan as (id: string, ch: unknown) => Promise<unknown>,
                () => setDirtyLoans(new Map()),
                ['loans'],
              )}
              onDiscard={() => { setDirtyLoans(new Map()); cancelLoanEdit(); }}
            />
          )}
        </div>

        {/* ── Investments ───────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Investments</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddInvest((v) => !v)}>
              {showAddInvest ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={investments ?? []}
            columns={investmentColumns}
            getRowVariant={() => 'asset' as RowVariant}
            getRowClass={(row) => dirtyInvestments.has(row.id) ? 'lt__row--dirty' : ''}
            totals={investmentTotals}
            isLoading={loadingInvestments}
            emptyMessage="No investments."
          />
          {showAddInvest && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput
                  value={addInvestBank}
                  onChange={(b) => { setAddInvestBank(b); setAddInvestForm((f) => ({ ...f, bankId: b?.id ?? null })); }}
                  placeholder="Institution (optional)"
                />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Label *"
                  value={addInvestForm.customLabel}
                  onChange={(e) => setAddInvestForm((f) => ({ ...f, customLabel: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addInvestForm.investmentType}
                  onChange={(e) => setAddInvestForm((f) => ({ ...f, investmentType: e.target.value }))}>
                  {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Value ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addInvestForm.currentValue === 0 ? '' : addInvestForm.currentValue}
                  placeholder="0.00"
                  onChange={(e) => setAddInvestForm((f) => ({ ...f, currentValue: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input acc-add-input--ticker" placeholder="Ticker (optional)"
                  value={addInvestForm.ticker ?? ''}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => setAddInvestForm((f) => ({ ...f, ticker: e.target.value || null }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddInvestment} disabled={addingInvest}>
                  {addingInvest ? 'Adding…' : 'Add Investment'}
                </button>
              </label>
            </div>
          )}
          {dirtyInvestments.size > 0 && (
            <BatchSaveBar
              dirtyCount={dirtyInvestments.size}
              saving={saving}
              onSave={() => saveAll(
                dirtyInvestments as Map<string, unknown>,
                updateInvestment as (id: string, ch: unknown) => Promise<unknown>,
                () => setDirtyInvestments(new Map()),
                ['investments'],
              )}
              onDiscard={() => { setDirtyInvestments(new Map()); cancelInvestEdit(); }}
            />
          )}
        </div>

        {/* ── Pending Items ─────────────────────────────── */}
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

        {/* ── Properties ────────────────────────────────── */}
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
