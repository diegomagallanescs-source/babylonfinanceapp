import { useState, useRef, useMemo, useEffect, useReducer } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { LedgerTable, type RowVariant } from '../../components/LedgerTable';
import { BankSearchInput } from '../../components/BankSearchInput';
import { CurrencyInput } from '../../components/accounting/CurrencyInput';
import { BankCell, CategoryPill, UtilBadge } from '../../components/accounting/AccountingBits';
import {
  ACCT_TYPES, LOAN_TYPES, INVESTMENT_TYPES, LOAN_PRODUCT_TYPES,
  getDealSignal, SIGNAL_LABEL,
} from '../../components/accounting/accountingOptions';
import { useBudgetCategories } from '../../hooks/useBudgetCategories';

import type { BankDto } from '../../types/ledger';
import type {
  ProjectionState,
  ProjectionAccountRow,
  ProjectionInvestmentRow,
  ProjectionCreditCardRow,
  ProjectionLoanRow,
  ProjectionPendingRow,
  ProjectionPropertyRow,
} from '../../types/projections';
import { computeProjectionNetWorth, newRowId, propertyCashFlow } from '../../utils/projectionState';
import { formatCurrency } from '../../utils/format';

// Reuses the Accounting tab's stylesheet so the copy renders identically.
import '../Accounting/AccountingPage.css';
import './ProjectionAccounting.css';

/**
 * A full copy of the Accounting tab that reads and writes a projection's own ledger.
 *
 * Every edit is a local state change handed back through onChange — this component never calls
 * the /accounts, /creditcards, /loans, /investments, /pending, or /properties endpoints, so
 * nothing done here can reach the real Accounting tab.
 *
 * Two rules keep the inline editors usable, both mirroring AccountingPage:
 *
 *  - In-progress edits live in refs, never in state. A keystroke that re-rendered this component
 *    would rebuild the column definitions below, and a fresh `cell` function is a new component
 *    type to React — it would tear down the focused input and drop the caret after every digit.
 *  - The columns are memoized, so their closures go stale. Anything a cell handler needs at click
 *    time is read through a ref rather than captured.
 */
export function ProjectionAccounting({
  state,
  onChange,
  disabled = false,
}: {
  state: ProjectionState;
  onChange: (next: ProjectionState) => void;
  disabled?: boolean;
}) {
  const { data: categories = [] } = useBudgetCategories();
  const nw = useMemo(() => computeProjectionNetWorth(state), [state]);

  // Memoized cells would otherwise apply their edit on top of whichever ledger was current when
  // the columns were last built, silently reverting edits made in another section since.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Bumped when a bank is picked — the only editor change that has to reach the screen.
  const [, refreshEditors] = useReducer((n: number) => n + 1, 0);

  // ── Section helpers ───────────────────────────────────────
  function patch(partial: Partial<ProjectionState>) {
    onChange({ ...stateRef.current, ...partial });
  }

  function updateRow<K extends keyof ProjectionState>(
    key: K,
    id: string,
    changes: Partial<ProjectionState[K][number]>,
  ) {
    const rows = stateRef.current[key] as ProjectionState[K][number][];
    patch({
      [key]: rows.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    } as Partial<ProjectionState>);
  }

  function removeRow<K extends keyof ProjectionState>(key: K, id: string) {
    const rows = stateRef.current[key] as ProjectionState[K][number][];
    patch({ [key]: rows.filter((r) => r.id !== id) } as Partial<ProjectionState>);
  }

  function addRow<K extends keyof ProjectionState>(key: K, row: ProjectionState[K][number]) {
    const rows = stateRef.current[key] as ProjectionState[K][number][];
    patch({ [key]: [...rows, row] } as Partial<ProjectionState>);
  }

  /** Bank picked mid-edit: stash it and repaint so the search box shows the choice. */
  function chooseBank(ref: React.RefObject<BankDto | null>, bank: BankDto | null) {
    ref.current = bank;
    refreshEditors();
  }

  function bankOf(row: { bankId: string | null; bankName: string | null; bankLogoUrl: string | null }): BankDto | null {
    return row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null;
  }

  /** The bank fields to write on apply. The ref is seeded from the row, so an untouched
   *  search box round-trips the original bank and a cleared one nulls all three. */
  function bankFields(bank: BankDto | null) {
    return { bankId: bank?.id ?? null, bankName: bank?.name ?? null, bankLogoUrl: bank?.logoUrl ?? null };
  }

  // ── Bank Accounts ─────────────────────────────────────────
  const [acctEditId, setAcctEditId] = useState<string | null>(null);
  const acctDraft = useRef<Partial<ProjectionAccountRow>>({});
  const acctBank = useRef<BankDto | null>(null);

  const [showAddAcct, setShowAddAcct] = useState(false);
  const [addAcctBank, setAddAcctBank] = useState<BankDto | null>(null);
  const [addAcctForm, setAddAcctForm] = useState({
    customLabel: '', balance: 0, accountType: 'Checking', budgetCategoryId: null as string | null,
  });
  const [addAcctKey, setAddAcctKey] = useState(0);

  function startAcctEdit(row: ProjectionAccountRow) {
    acctDraft.current = {
      customLabel: row.customLabel,
      balance: row.balance,
      accountType: row.accountType,
      budgetCategoryId: row.budgetCategoryId,
    };
    acctBank.current = bankOf(row);
    setAcctEditId(row.id);
  }

  function applyAcctEdit(row: ProjectionAccountRow) {
    updateRow('accounts', row.id, { ...acctDraft.current, ...bankFields(acctBank.current) });
    cancelAcctEdit();
  }

  function cancelAcctEdit() {
    acctDraft.current = {};
    acctBank.current = null;
    setAcctEditId(null);
  }

  function handleAddAccount() {
    if (!addAcctForm.customLabel.trim()) return;
    addRow('accounts', {
      id: newRowId(),
      ...bankFields(addAcctBank),
      customLabel: addAcctForm.customLabel.trim(),
      balance: addAcctForm.balance,
      accountType: addAcctForm.accountType,
      budgetCategoryId: addAcctForm.budgetCategoryId,
    });
    setAddAcctForm({ customLabel: '', balance: 0, accountType: 'Checking', budgetCategoryId: null });
    setAddAcctBank(null);
    setAddAcctKey((k) => k + 1);
    setShowAddAcct(false);
  }

  const accountColumns = useMemo<ColumnDef<ProjectionAccountRow, unknown>[]>(() => [
    {
      id: 'bank', header: 'Bank', accessorKey: 'bankName',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <BankSearchInput
              value={acctBank.current}
              onChange={(bank) => chooseBank(acctBank, bank)}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-acct-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={acctDraft.current.customLabel ?? row.original.customLabel}
              onChange={(e) => { acctDraft.current.customLabel = e.target.value; }} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'accountType', header: 'Type',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <select key={`${row.original.id}-acct-type`} className="lt__edit-select"
              defaultValue={acctDraft.current.accountType ?? row.original.accountType}
              onChange={(e) => { acctDraft.current.accountType = e.target.value; }}>
              {ACCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.accountType;
      },
    },
    {
      accessorKey: 'balance', header: 'Balance',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-acct-balance`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={acctDraft.current.balance ?? row.original.balance}
              onChange={(v) => { acctDraft.current.balance = v; }}
            />
          );
        }
        return <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.balance)}</span>;
      },
    },
    {
      id: 'budgetCategory', header: 'Category', accessorKey: 'budgetCategoryId', enableSorting: false,
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <select key={`${row.original.id}-acct-cat`} className="lt__edit-select"
              defaultValue={acctDraft.current.budgetCategoryId ?? row.original.budgetCategoryId ?? ''}
              onChange={(e) => { acctDraft.current.budgetCategoryId = e.target.value || null; }}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          );
        }
        return <CategoryPill cat={categories.find((c) => c.id === row.original.budgetCategoryId)} />;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 140,
      cell: ({ row }) => rowActions(
        acctEditId === row.original.id,
        () => applyAcctEdit(row.original),
        cancelAcctEdit,
        () => startAcctEdit(row.original),
        () => removeRow('accounts', row.original.id),
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [acctEditId, categories, disabled]);

  // ── Investments ───────────────────────────────────────────
  const [investEditId, setInvestEditId] = useState<string | null>(null);
  const investDraft = useRef<Partial<ProjectionInvestmentRow>>({});
  const investBank = useRef<BankDto | null>(null);

  const [showAddInvest, setShowAddInvest] = useState(false);
  const [addInvestBank, setAddInvestBank] = useState<BankDto | null>(null);
  const [addInvestForm, setAddInvestForm] = useState({
    customLabel: '', currentValue: 0, investmentType: 'Brokerage',
  });
  const [addInvestKey, setAddInvestKey] = useState(0);

  function startInvestEdit(row: ProjectionInvestmentRow) {
    investDraft.current = {
      customLabel: row.customLabel,
      currentValue: row.currentValue,
      investmentType: row.investmentType,
    };
    investBank.current = bankOf(row);
    setInvestEditId(row.id);
  }

  function applyInvestEdit(row: ProjectionInvestmentRow) {
    updateRow('investments', row.id, { ...investDraft.current, ...bankFields(investBank.current) });
    cancelInvestEdit();
  }

  function cancelInvestEdit() {
    investDraft.current = {};
    investBank.current = null;
    setInvestEditId(null);
  }

  function handleAddInvestment() {
    if (!addInvestForm.customLabel.trim()) return;
    addRow('investments', {
      id: newRowId(),
      ...bankFields(addInvestBank),
      customLabel: addInvestForm.customLabel.trim(),
      currentValue: addInvestForm.currentValue,
      ticker: null,
      investmentType: addInvestForm.investmentType,
    });
    setAddInvestForm({ customLabel: '', currentValue: 0, investmentType: 'Brokerage' });
    setAddInvestBank(null);
    setAddInvestKey((k) => k + 1);
    setShowAddInvest(false);
  }

  const investmentColumns = useMemo<ColumnDef<ProjectionInvestmentRow, unknown>[]>(() => [
    {
      id: 'bank', header: 'Bank', accessorKey: 'bankName',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <BankSearchInput
              value={investBank.current}
              onChange={(bank) => chooseBank(investBank, bank)}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-invest-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={investDraft.current.customLabel ?? row.original.customLabel}
              onChange={(e) => { investDraft.current.customLabel = e.target.value; }} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'investmentType', header: 'Type',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <select key={`${row.original.id}-invest-type`} className="lt__edit-select"
              defaultValue={investDraft.current.investmentType ?? row.original.investmentType}
              onChange={(e) => { investDraft.current.investmentType = e.target.value; }}>
              {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.investmentType;
      },
    },
    {
      accessorKey: 'currentValue', header: 'Value',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-invest-value`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={investDraft.current.currentValue ?? row.original.currentValue}
              onChange={(v) => { investDraft.current.currentValue = v; }}
            />
          );
        }
        return <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.currentValue)}</span>;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 140,
      cell: ({ row }) => rowActions(
        investEditId === row.original.id,
        () => applyInvestEdit(row.original),
        cancelInvestEdit,
        () => startInvestEdit(row.original),
        () => removeRow('investments', row.original.id),
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [investEditId, disabled]);

  // ── Credit Cards ──────────────────────────────────────────
  const [cardEditId, setCardEditId] = useState<string | null>(null);
  const cardDraft = useRef<Partial<ProjectionCreditCardRow>>({});
  const cardBank = useRef<BankDto | null>(null);

  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardBank, setAddCardBank] = useState<BankDto | null>(null);
  const [addCardForm, setAddCardForm] = useState({
    customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal',
  });
  const [addCardKey, setAddCardKey] = useState(0);

  function startCardEdit(row: ProjectionCreditCardRow) {
    cardDraft.current = {
      customLabel: row.customLabel,
      balance: row.balance,
      creditLimit: row.creditLimit,
      apr: row.apr,
      cardType: row.cardType,
    };
    cardBank.current = bankOf(row);
    setCardEditId(row.id);
  }

  function applyCardEdit(row: ProjectionCreditCardRow) {
    updateRow('creditCards', row.id, { ...cardDraft.current, ...bankFields(cardBank.current) });
    cancelCardEdit();
  }

  function cancelCardEdit() {
    cardDraft.current = {};
    cardBank.current = null;
    setCardEditId(null);
  }

  function handleAddCard() {
    if (!addCardForm.customLabel.trim()) return;
    addRow('creditCards', {
      id: newRowId(),
      ...bankFields(addCardBank),
      customLabel: addCardForm.customLabel.trim(),
      balance: addCardForm.balance,
      creditLimit: addCardForm.creditLimit,
      apr: addCardForm.apr,
      cardType: addCardForm.cardType,
    });
    setAddCardForm({ customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal' });
    setAddCardBank(null);
    setAddCardKey((k) => k + 1);
    setShowAddCard(false);
  }

  const cardColumns = useMemo<ColumnDef<ProjectionCreditCardRow, unknown>[]>(() => [
    {
      id: 'bank', header: 'Bank', accessorKey: 'bankName',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <BankSearchInput
              value={cardBank.current}
              onChange={(bank) => chooseBank(cardBank, bank)}
            />
          );
        }
        return <BankCell logoUrl={row.original.bankLogoUrl} name={row.original.bankName} />;
      },
    },
    {
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-card-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={cardDraft.current.customLabel ?? row.original.customLabel}
              onChange={(e) => { cardDraft.current.customLabel = e.target.value; }} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'balance', header: 'Balance',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-card-balance`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={cardDraft.current.balance ?? row.original.balance}
              onChange={(v) => { cardDraft.current.balance = v; }}
            />
          );
        }
        const bal = row.original.balance;
        return <span className={`acc-amount ${bal > 0 ? 'acc-amount--negative' : ''}`}>{formatCurrency(bal)}</span>;
      },
    },
    {
      accessorKey: 'creditLimit', header: 'Limit',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-card-limit`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={cardDraft.current.creditLimit ?? row.original.creditLimit}
              onChange={(v) => { cardDraft.current.creditLimit = v; }}
            />
          );
        }
        return formatCurrency(row.original.creditLimit);
      },
    },
    {
      accessorKey: 'apr', header: 'APR',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-card-apr`} className="lt__edit-input lt__edit-input--number"
              type="number" step="0.01" placeholder="%" style={{ maxWidth: 72 }}
              defaultValue={Number(((cardDraft.current.apr ?? row.original.apr) * 100).toFixed(2))}
              onChange={(e) => { cardDraft.current.apr = Number(e.target.value) / 100; }} />
          );
        }
        return `${(row.original.apr * 100).toFixed(0)}%`;
      },
    },
    {
      id: 'utilization', header: 'Util %', enableSorting: false,
      cell: ({ row }) => <UtilBadge balance={row.original.balance} limit={row.original.creditLimit} />,
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 110,
      cell: ({ row }) => rowActions(
        cardEditId === row.original.id,
        () => applyCardEdit(row.original),
        cancelCardEdit,
        () => startCardEdit(row.original),
        () => removeRow('creditCards', row.original.id),
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [cardEditId, disabled]);

  // ── Loans ─────────────────────────────────────────────────
  const [loanEditId, setLoanEditId] = useState<string | null>(null);
  const loanDraft = useRef<Partial<ProjectionLoanRow>>({});
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addLoanForm, setAddLoanForm] = useState({
    customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage',
  });
  const [addLoanKey, setAddLoanKey] = useState(0);

  function startLoanEdit(row: ProjectionLoanRow) {
    loanDraft.current = {
      customLabel: row.customLabel,
      lenderName: row.lenderName,
      balance: row.balance,
      interestRate: row.interestRate,
      loanType: row.loanType,
    };
    setLoanEditId(row.id);
  }

  function applyLoanEdit(row: ProjectionLoanRow) {
    updateRow('loans', row.id, { ...loanDraft.current });
    cancelLoanEdit();
  }

  function cancelLoanEdit() {
    loanDraft.current = {};
    setLoanEditId(null);
  }

  function handleAddLoan() {
    if (!addLoanForm.customLabel.trim()) return;
    addRow('loans', { id: newRowId(), ...addLoanForm, customLabel: addLoanForm.customLabel.trim() });
    setAddLoanForm({ customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage' });
    setAddLoanKey((k) => k + 1);
    setShowAddLoan(false);
  }

  const loanColumns = useMemo<ColumnDef<ProjectionLoanRow, unknown>[]>(() => [
    {
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={loanDraft.current.customLabel ?? row.original.customLabel}
              onChange={(e) => { loanDraft.current.customLabel = e.target.value; }} />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'lenderName', header: 'Lender',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-lender`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={loanDraft.current.lenderName ?? row.original.lenderName}
              onChange={(e) => { loanDraft.current.lenderName = e.target.value; }} />
          );
        }
        return row.original.lenderName;
      },
    },
    {
      accessorKey: 'loanType', header: 'Type',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <select key={`${row.original.id}-loan-type`} className="lt__edit-select"
              defaultValue={loanDraft.current.loanType ?? row.original.loanType}
              onChange={(e) => { loanDraft.current.loanType = e.target.value; }}>
              {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          );
        }
        return row.original.loanType;
      },
    },
    {
      accessorKey: 'balance', header: 'Balance',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-loan-balance`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={loanDraft.current.balance ?? row.original.balance}
              onChange={(v) => { loanDraft.current.balance = v; }}
            />
          );
        }
        return <span className="acc-amount acc-amount--negative">-{formatCurrency(row.original.balance)}</span>;
      },
    },
    {
      accessorKey: 'interestRate', header: 'Rate',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-rate`} className="lt__edit-input lt__edit-input--number"
              type="number" step="0.01" min="0" style={{ maxWidth: 72 }}
              defaultValue={Number(((loanDraft.current.interestRate ?? row.original.interestRate) * 100).toFixed(3))}
              onChange={(e) => { loanDraft.current.interestRate = Number(e.target.value) / 100; }} />
          );
        }
        return `${(row.original.interestRate * 100).toFixed(2)}%`;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 130,
      cell: ({ row }) => rowActions(
        loanEditId === row.original.id,
        () => applyLoanEdit(row.original),
        cancelLoanEdit,
        () => startLoanEdit(row.original),
        () => removeRow('loans', row.original.id),
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [loanEditId, disabled]);

  // ── Pending Items ─────────────────────────────────────────
  const [showAddPending, setShowAddPending] = useState(false);
  const [addPendingForm, setAddPendingForm] = useState({
    description: '', counterparty: null as string | null, amount: 0, dueDate: null as string | null,
  });

  function handleAddPending() {
    if (!addPendingForm.description.trim()) return;
    addRow('pendingItems', {
      id: newRowId(),
      description: addPendingForm.description.trim(),
      counterparty: addPendingForm.counterparty,
      amount: addPendingForm.amount,
      dueDate: addPendingForm.dueDate,
      status: 'Pending',
    });
    setAddPendingForm({ description: '', counterparty: null, amount: 0, dueDate: null });
    setShowAddPending(false);
  }

  const pendingColumns = useMemo<ColumnDef<ProjectionPendingRow, unknown>[]>(() => [
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    {
      accessorKey: 'amount', header: 'Amount',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return (
          <span className={`acc-amount ${v >= 0 ? 'acc-amount--positive' : 'acc-amount--negative'}`}>
            {formatCurrency(v)}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate', header: 'Due Date',
      cell: ({ getValue }) => {
        const d = getValue<string | null>();
        return d ? new Date(`${d}T00:00:00`).toLocaleDateString() : <span style={{ opacity: 0.4 }}>—</span>;
      },
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return <span className={`acc-badge acc-badge--${s.toLowerCase()}`}>{s}</span>;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 140,
      cell: ({ row }) => (
        <div className="lt__actions">
          {row.original.status !== 'Settled' && (
            <button className="lt__action-btn lt__action-btn--settle" type="button" disabled={disabled}
              onClick={() => updateRow('pendingItems', row.original.id, { status: 'Settled' })}>
              Settle
            </button>
          )}
          <button className="lt__action-btn lt__action-btn--delete" type="button" disabled={disabled}
            onClick={() => removeRow('pendingItems', row.original.id)}>
            Delete
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [disabled]);

  // ── Properties ────────────────────────────────────────────
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addPropertyForm, setAddPropertyForm] = useState<Omit<ProjectionPropertyRow, 'id'>>({
    address: '', purchasePrice: 0, currentEstimatedValue: 0, loanBalance: 0,
    interestRate: 0, loanType: 'Conventional', monthlyRent: 0, monthlyExpenses: 0,
  });

  function handleAddProperty() {
    if (!addPropertyForm.address.trim()) return;
    addRow('properties', { id: newRowId(), ...addPropertyForm, address: addPropertyForm.address.trim() });
    setAddPropertyForm({
      address: '', purchasePrice: 0, currentEstimatedValue: 0, loanBalance: 0,
      interestRate: 0, loanType: 'Conventional', monthlyRent: 0, monthlyExpenses: 0,
    });
    setShowAddProperty(false);
  }

  // ── Shared row action buttons ─────────────────────────────
  function rowActions(
    isEditing: boolean,
    onApply: () => void,
    onCancel: () => void,
    onEdit: () => void,
    onDelete: () => void,
  ) {
    if (isEditing) {
      return (
        <div className="lt__actions">
          <button className="lt__action-btn lt__action-btn--apply" type="button" onClick={onApply}>Apply</button>
          <button className="lt__action-btn lt__action-btn--cancel" type="button" onClick={onCancel}>Cancel</button>
        </div>
      );
    }
    return (
      <div className="lt__actions">
        <button className="lt__action-btn lt__action-btn--edit" type="button" disabled={disabled} onClick={onEdit}>Edit</button>
        <button className="lt__action-btn lt__action-btn--delete" type="button" disabled={disabled} onClick={onDelete}>Delete</button>
      </div>
    );
  }

  // ── Splits + totals ───────────────────────────────────────
  const businessCards = state.creditCards.filter((c) => c.cardType === 'Business').sort((a, b) => b.balance - a.balance);
  const personalCards = state.creditCards.filter((c) => c.cardType === 'Personal').sort((a, b) => b.balance - a.balance);
  const sortedInvestments = [...state.investments].sort((a, b) => b.currentValue - a.currentValue);

  const accountTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--positive">{formatCurrency(state.accounts.reduce((s, a) => s + a.balance, 0))}</span>,
  };
  const investmentTotals = {
    customLabel: 'Total',
    currentValue: <span className="acc-amount acc-amount--positive">{formatCurrency(state.investments.reduce((s, i) => s + i.currentValue, 0))}</span>,
  };
  const bizCardTotals = {
    customLabel: 'Total',
    balance: (() => { const t = businessCards.reduce((s, c) => s + c.balance, 0); return <span className={`acc-amount ${t > 0 ? 'acc-amount--negative' : ''}`}>{formatCurrency(t)}</span>; })(),
    creditLimit: formatCurrency(businessCards.reduce((s, c) => s + c.creditLimit, 0)),
  };
  const persCardTotals = {
    customLabel: 'Total',
    balance: (() => { const t = personalCards.reduce((s, c) => s + c.balance, 0); return <span className={`acc-amount ${t > 0 ? 'acc-amount--negative' : ''}`}>{formatCurrency(t)}</span>; })(),
    creditLimit: formatCurrency(personalCards.reduce((s, c) => s + c.creditLimit, 0)),
  };
  const loanTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--negative">-{formatCurrency(state.loans.reduce((s, l) => s + l.balance, 0))}</span>,
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className={`proj-acc${disabled ? ' proj-acc--locked' : ''}`}>
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
        {nw.hasProperties && (
          <>
            <div className="acc-summary-divider" />
            <div className="acc-summary-item">
              <span className="acc-summary-label">Total NW</span>
              <span className={`acc-summary-value ${nw.totalNetWorth >= 0 ? 'acc-summary-value--positive' : 'acc-summary-value--negative'}`}>
                {formatCurrency(nw.totalNetWorth)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="acc-sections">

        {/* ── Bank Accounts ──────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Bank Accounts</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddAcct((v) => !v)}>
              {showAddAcct ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={state.accounts}
            columns={accountColumns}
            getRowVariant={() => 'asset' as RowVariant}
            totals={accountTotals}
            emptyMessage="No bank accounts yet."
          />
          {showAddAcct && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput key={`acct-bank-${addAcctKey}`} value={addAcctBank}
                  onChange={setAddAcctBank} placeholder="Bank (optional)" />
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
                <CurrencyInput key={`acct-bal-${addAcctKey}`} className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddAcctForm((f) => ({ ...f, balance: v }))} />
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
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddAccount}>
                  Add Account
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Investment Accounts ────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Investment Accounts</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddInvest((v) => !v)}>
              {showAddInvest ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={sortedInvestments}
            columns={investmentColumns}
            getRowVariant={() => 'asset' as RowVariant}
            totals={investmentTotals}
            emptyMessage="No investment accounts yet."
          />
          {showAddInvest && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput key={`invest-bank-${addInvestKey}`} value={addInvestBank}
                  onChange={setAddInvestBank} placeholder="Brokerage (optional)" />
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
                <CurrencyInput key={`invest-val-${addInvestKey}`} className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddInvestForm((f) => ({ ...f, currentValue: v }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddInvestment}>
                  Add Investment
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Credit Cards ──────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Credit Cards</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddCard((v) => !v)}>
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
                totals={bizCardTotals}
                emptyMessage="No business cards."
              />
            </div>
            <div className="acc-section">
              <span className="acc-section-title acc-section-title--sub">Personal</span>
              <LedgerTable
                data={personalCards}
                columns={cardColumns}
                getRowVariant={() => 'liability' as RowVariant}
                totals={persCardTotals}
                emptyMessage="No personal cards."
              />
            </div>
          </div>
          {showAddCard && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput key={`card-bank-${addCardKey}`} value={addCardBank}
                  onChange={setAddCardBank} placeholder="Bank (optional)" />
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
                <CurrencyInput key={`card-bal-${addCardKey}`} className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddCardForm((f) => ({ ...f, balance: v }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Credit Limit ($)</span>
                <CurrencyInput key={`card-lim-${addCardKey}`} className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddCardForm((f) => ({ ...f, creditLimit: v }))} />
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
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddCard}>
                  Add Card
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Loans ─────────────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Loans</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddLoan((v) => !v)}>
              {showAddLoan ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={state.loans}
            columns={loanColumns}
            getRowVariant={() => 'liability' as RowVariant}
            totals={loanTotals}
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
                <CurrencyInput key={`loan-bal-${addLoanKey}`} className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddLoanForm((f) => ({ ...f, balance: v }))} />
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
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddLoan}>
                  Add Loan
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Pending Items ─────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Pending Items</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddPending((v) => !v)}>
              {showAddPending ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={state.pendingItems.filter((p) => p.status !== 'Settled')}
            columns={pendingColumns}
            getRowVariant={(row) => (row.amount >= 0 ? 'asset' : 'liability')}
            emptyMessage="No pending items."
          />
          {showAddPending && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Description *"
                  value={addPendingForm.description}
                  onChange={(e) => setAddPendingForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Counterparty (optional)"
                  value={addPendingForm.counterparty ?? ''}
                  onChange={(e) => setAddPendingForm((f) => ({ ...f, counterparty: e.target.value || null }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Amount ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01"
                  value={addPendingForm.amount === 0 ? '' : addPendingForm.amount}
                  placeholder="0.00"
                  onChange={(e) => setAddPendingForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Due Date</span>
                <input className="acc-add-input" type="date"
                  value={addPendingForm.dueDate ?? ''}
                  onChange={(e) => setAddPendingForm((f) => ({ ...f, dueDate: e.target.value || null }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddPending}>
                  Add Item
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Properties ────────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Properties</span>
            <button className="acc-btn-add" type="button" disabled={disabled}
              onClick={() => setShowAddProperty((v) => !v)}>
              {showAddProperty ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          {showAddProperty && (
            <div className="acc-add-form">
              <label className="acc-add-field" style={{ flex: '2 1 200px' }}>
                <span className="acc-add-field-label">&nbsp;</span>
                <input className="acc-add-input" placeholder="Address *"
                  value={addPropertyForm.address}
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, address: e.target.value }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Purchase ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.purchasePrice === 0 ? '' : addPropertyForm.purchasePrice}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, purchasePrice: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Est. Value ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.currentEstimatedValue === 0 ? '' : addPropertyForm.currentEstimatedValue}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, currentEstimatedValue: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Loan Balance ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.loanBalance === 0 ? '' : addPropertyForm.loanBalance}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, loanBalance: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Rate (%)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.interestRate === 0 ? '' : Number((addPropertyForm.interestRate * 100).toFixed(3))}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, interestRate: Number(e.target.value) / 100 }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <select className="acc-add-select" value={addPropertyForm.loanType}
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, loanType: e.target.value }))}>
                  {LOAN_PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Rent/mo ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.monthlyRent === 0 ? '' : addPropertyForm.monthlyRent}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, monthlyRent: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Expenses/mo ($)</span>
                <input className="acc-add-input acc-add-input--number" type="number" step="0.01" min="0"
                  value={addPropertyForm.monthlyExpenses === 0 ? '' : addPropertyForm.monthlyExpenses}
                  placeholder="0.00"
                  onChange={(e) => setAddPropertyForm((f) => ({ ...f, monthlyExpenses: Number(e.target.value) }))} />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={handleAddProperty}>
                  Add Property
                </button>
              </label>
            </div>
          )}
          {state.properties.length === 0 ? (
            <div className="acc-empty">No properties saved yet.</div>
          ) : (
            <div className="acc-props-grid">
              {state.properties.map((p) => (
                <ProjectionPropertyCard
                  key={p.id}
                  property={p}
                  disabled={disabled}
                  onSave={(changes) => updateRow('properties', p.id, changes)}
                  onDelete={() => removeRow('properties', p.id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── PropertyCard ──────────────────────────────────────────────
function ProjectionPropertyCard({
  property,
  disabled,
  onSave,
  onDelete,
}: {
  property: ProjectionPropertyRow;
  disabled: boolean;
  onSave: (changes: Partial<ProjectionPropertyRow>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<ProjectionPropertyRow>>({});

  const cashFlow = propertyCashFlow(property);
  const signal = getDealSignal({ ...property, monthlyCashFlow: cashFlow });
  const equity = property.currentEstimatedValue - property.loanBalance;

  function startEdit() {
    setDraft({
      address: property.address,
      purchasePrice: property.purchasePrice,
      currentEstimatedValue: property.currentEstimatedValue,
      loanBalance: property.loanBalance,
      monthlyRent: property.monthlyRent,
      monthlyExpenses: property.monthlyExpenses,
    });
    setEditing(true);
  }

  function field(label: string, key: keyof ProjectionPropertyRow) {
    const raw = draft[key] as number;
    return (
      <div className="acc-prop-row">
        <span className="acc-prop-label">{label}</span>
        <input
          className="acc-prop-edit-input"
          type="number"
          step="0.01"
          min="0"
          value={raw === 0 ? '' : raw}
          placeholder="0.00"
          onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="acc-prop-card acc-prop-card--editing">
        <div className="acc-prop-row">
          <span className="acc-prop-label">Address</span>
          <input
            className="acc-prop-edit-input acc-prop-edit-input--wide"
            value={draft.address ?? ''}
            placeholder="Street address"
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
          />
        </div>
        {field('Purchase ($)', 'purchasePrice')}
        {field('Est. Value ($)', 'currentEstimatedValue')}
        {field('Loan Balance ($)', 'loanBalance')}
        {field('Monthly Rent ($)', 'monthlyRent')}
        {field('Monthly Expenses ($)', 'monthlyExpenses')}
        <div className="acc-prop-card-actions">
          <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
            onClick={() => { onSave(draft); setEditing(false); setDraft({}); }}>
            Save
          </button>
          <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button"
            onClick={() => { setEditing(false); setDraft({}); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="acc-prop-card">
      <div className="acc-prop-header">
        <div className="acc-prop-address">{property.address}</div>
        <span className={`acc-prop-signal acc-prop-signal--${signal}`}>{SIGNAL_LABEL[signal]}</span>
      </div>
      <div className="acc-prop-row">
        <span className="acc-prop-label">Est. Value</span>
        <span>{formatCurrency(property.currentEstimatedValue)}</span>
      </div>
      <div className="acc-prop-row">
        <span className="acc-prop-label">Equity</span>
        <span className="acc-amount acc-amount--positive">{formatCurrency(equity)}</span>
      </div>
      <div className="acc-prop-divider" />
      <div className="acc-prop-row">
        <span className="acc-prop-label">Rent</span>
        <span>{formatCurrency(property.monthlyRent)}/mo</span>
      </div>
      <div className="acc-prop-row">
        <span className="acc-prop-label">Expenses</span>
        <span>{formatCurrency(property.monthlyExpenses)}/mo</span>
      </div>
      <div className="acc-prop-row">
        <span className="acc-prop-label">Cash Flow</span>
        <span className={`acc-amount ${cashFlow >= 0 ? 'acc-amount--positive' : 'acc-amount--negative'}`}>
          {cashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow)}/mo
        </span>
      </div>
      <div className="acc-prop-card-actions">
        <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button" disabled={disabled} onClick={startEdit}>Edit</button>
        <button className="acc-btn acc-btn--danger acc-btn--sm" type="button" disabled={disabled} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
