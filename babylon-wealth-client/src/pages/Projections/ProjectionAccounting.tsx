import { useState, useRef, useMemo } from 'react';
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

  // ── Section helpers ───────────────────────────────────────
  function patch(partial: Partial<ProjectionState>) {
    onChange({ ...state, ...partial });
  }

  function updateRow<K extends keyof ProjectionState>(
    key: K,
    id: string,
    changes: Partial<ProjectionState[K][number]>,
  ) {
    const rows = state[key] as ProjectionState[K][number][];
    patch({
      [key]: rows.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    } as Partial<ProjectionState>);
  }

  function removeRow<K extends keyof ProjectionState>(key: K, id: string) {
    const rows = state[key] as ProjectionState[K][number][];
    patch({ [key]: rows.filter((r) => r.id !== id) } as Partial<ProjectionState>);
  }

  function addRow<K extends keyof ProjectionState>(key: K, row: ProjectionState[K][number]) {
    const rows = state[key] as ProjectionState[K][number][];
    patch({ [key]: [...rows, row] } as Partial<ProjectionState>);
  }

  // ── Bank Accounts ─────────────────────────────────────────
  const [acctEditId, setAcctEditId] = useState<string | null>(null);
  const [acctDraft, setAcctDraft] = useState<Partial<ProjectionAccountRow>>({});
  const [acctEditBank, setAcctEditBank] = useState<BankDto | null>(null);
  const acctEditBankRef = useRef(acctEditBank);
  acctEditBankRef.current = acctEditBank;

  const [showAddAcct, setShowAddAcct] = useState(false);
  const [addAcctBank, setAddAcctBank] = useState<BankDto | null>(null);
  const [addAcctForm, setAddAcctForm] = useState({
    customLabel: '', balance: 0, accountType: 'Checking', budgetCategoryId: null as string | null,
  });
  const [addAcctKey, setAddAcctKey] = useState(0);

  function startAcctEdit(row: ProjectionAccountRow) {
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

  function applyAcctEdit(row: ProjectionAccountRow) {
    const bank = acctEditBankRef.current;
    updateRow('accounts', row.id, {
      ...acctDraft,
      bankId: bank ? bank.id : ('bankId' in acctDraft ? acctDraft.bankId ?? null : row.bankId),
      bankName: bank ? bank.name : ('bankId' in acctDraft && !acctDraft.bankId ? null : row.bankName),
      bankLogoUrl: bank ? bank.logoUrl : ('bankId' in acctDraft && !acctDraft.bankId ? null : row.bankLogoUrl),
    });
    cancelAcctEdit();
  }

  function cancelAcctEdit() {
    setAcctEditId(null);
    setAcctDraft({});
    setAcctEditBank(null);
  }

  function handleAddAccount() {
    if (!addAcctForm.customLabel.trim()) return;
    addRow('accounts', {
      id: newRowId(),
      bankId: addAcctBank?.id ?? null,
      bankName: addAcctBank?.name ?? null,
      bankLogoUrl: addAcctBank?.logoUrl ?? null,
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
              value={acctEditBankRef.current}
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
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-acct-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={acctDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setAcctDraft((d) => ({ ...d, customLabel: e.target.value }))} />
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
            <select className="lt__edit-select"
              value={acctDraft.accountType ?? row.original.accountType}
              onChange={(e) => setAcctDraft((d) => ({ ...d, accountType: e.target.value }))}>
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
              defaultValue={acctDraft.balance ?? row.original.balance}
              onChange={(v) => setAcctDraft((d) => ({ ...d, balance: v }))}
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
            <select className="lt__edit-select"
              value={acctDraft.budgetCategoryId ?? row.original.budgetCategoryId ?? ''}
              onChange={(e) => setAcctDraft((d) => ({ ...d, budgetCategoryId: e.target.value || null }))}>
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
  ], [acctEditId, acctDraft, categories, state.accounts, disabled]);

  // ── Investments ───────────────────────────────────────────
  const [investEditId, setInvestEditId] = useState<string | null>(null);
  const [investDraft, setInvestDraft] = useState<Partial<ProjectionInvestmentRow>>({});
  const [investEditBank, setInvestEditBank] = useState<BankDto | null>(null);
  const investEditBankRef = useRef(investEditBank);
  investEditBankRef.current = investEditBank;

  const [showAddInvest, setShowAddInvest] = useState(false);
  const [addInvestBank, setAddInvestBank] = useState<BankDto | null>(null);
  const [addInvestForm, setAddInvestForm] = useState({
    customLabel: '', currentValue: 0, investmentType: 'Brokerage',
  });
  const [addInvestKey, setAddInvestKey] = useState(0);

  function startInvestEdit(row: ProjectionInvestmentRow) {
    setInvestEditId(row.id);
    setInvestDraft({
      customLabel: row.customLabel,
      currentValue: row.currentValue,
      investmentType: row.investmentType,
      bankId: row.bankId,
    });
    setInvestEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyInvestEdit(row: ProjectionInvestmentRow) {
    const bank = investEditBankRef.current;
    updateRow('investments', row.id, {
      ...investDraft,
      bankId: bank ? bank.id : ('bankId' in investDraft ? investDraft.bankId ?? null : row.bankId),
      bankName: bank ? bank.name : ('bankId' in investDraft && !investDraft.bankId ? null : row.bankName),
      bankLogoUrl: bank ? bank.logoUrl : ('bankId' in investDraft && !investDraft.bankId ? null : row.bankLogoUrl),
    });
    cancelInvestEdit();
  }

  function cancelInvestEdit() {
    setInvestEditId(null);
    setInvestDraft({});
    setInvestEditBank(null);
  }

  function handleAddInvestment() {
    if (!addInvestForm.customLabel.trim()) return;
    addRow('investments', {
      id: newRowId(),
      bankId: addInvestBank?.id ?? null,
      bankName: addInvestBank?.name ?? null,
      bankLogoUrl: addInvestBank?.logoUrl ?? null,
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
              value={investEditBankRef.current}
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
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-invest-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={investDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setInvestDraft((d) => ({ ...d, customLabel: e.target.value }))} />
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
      accessorKey: 'currentValue', header: 'Value',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-invest-value`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={investDraft.currentValue ?? row.original.currentValue}
              onChange={(v) => setInvestDraft((d) => ({ ...d, currentValue: v }))}
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
  ], [investEditId, investDraft, state.investments, disabled]);

  // ── Credit Cards ──────────────────────────────────────────
  const [cardEditId, setCardEditId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<Partial<ProjectionCreditCardRow>>({});
  const [cardEditBank, setCardEditBank] = useState<BankDto | null>(null);
  const cardEditBankRef = useRef(cardEditBank);
  cardEditBankRef.current = cardEditBank;

  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardBank, setAddCardBank] = useState<BankDto | null>(null);
  const [addCardForm, setAddCardForm] = useState({
    customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal',
  });
  const [addCardKey, setAddCardKey] = useState(0);

  function startCardEdit(row: ProjectionCreditCardRow) {
    setCardEditId(row.id);
    setCardDraft({
      customLabel: row.customLabel,
      balance: row.balance,
      creditLimit: row.creditLimit,
      apr: row.apr,
      cardType: row.cardType,
      bankId: row.bankId,
    });
    setCardEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyCardEdit(row: ProjectionCreditCardRow) {
    const bank = cardEditBankRef.current;
    updateRow('creditCards', row.id, {
      ...cardDraft,
      bankId: bank ? bank.id : ('bankId' in cardDraft ? cardDraft.bankId ?? null : row.bankId),
      bankName: bank ? bank.name : ('bankId' in cardDraft && !cardDraft.bankId ? null : row.bankName),
      bankLogoUrl: bank ? bank.logoUrl : ('bankId' in cardDraft && !cardDraft.bankId ? null : row.bankLogoUrl),
    });
    cancelCardEdit();
  }

  function cancelCardEdit() {
    setCardEditId(null);
    setCardDraft({});
    setCardEditBank(null);
  }

  function handleAddCard() {
    if (!addCardForm.customLabel.trim()) return;
    addRow('creditCards', {
      id: newRowId(),
      bankId: addCardBank?.id ?? null,
      bankName: addCardBank?.name ?? null,
      bankLogoUrl: addCardBank?.logoUrl ?? null,
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
              value={cardEditBankRef.current}
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
      accessorKey: 'customLabel', header: 'Label',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-card-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={cardDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setCardDraft((d) => ({ ...d, customLabel: e.target.value }))} />
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
              defaultValue={cardDraft.balance ?? row.original.balance}
              onChange={(v) => setCardDraft((d) => ({ ...d, balance: v }))}
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
              defaultValue={cardDraft.creditLimit ?? row.original.creditLimit}
              onChange={(v) => setCardDraft((d) => ({ ...d, creditLimit: v }))}
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
              defaultValue={Number(((cardDraft.apr ?? row.original.apr) * 100).toFixed(2))}
              onChange={(e) => setCardDraft((d) => ({ ...d, apr: Number(e.target.value) / 100 }))} />
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
  ], [cardEditId, cardDraft, state.creditCards, disabled]);

  // ── Loans ─────────────────────────────────────────────────
  const [loanEditId, setLoanEditId] = useState<string | null>(null);
  const [loanDraft, setLoanDraft] = useState<Partial<ProjectionLoanRow>>({});
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addLoanForm, setAddLoanForm] = useState({
    customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage',
  });
  const [addLoanKey, setAddLoanKey] = useState(0);

  function startLoanEdit(row: ProjectionLoanRow) {
    setLoanEditId(row.id);
    setLoanDraft({
      customLabel: row.customLabel,
      lenderName: row.lenderName,
      balance: row.balance,
      interestRate: row.interestRate,
      loanType: row.loanType,
    });
  }

  function cancelLoanEdit() {
    setLoanEditId(null);
    setLoanDraft({});
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
              defaultValue={loanDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setLoanDraft((d) => ({ ...d, customLabel: e.target.value }))} />
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
              defaultValue={loanDraft.lenderName ?? row.original.lenderName}
              onChange={(e) => setLoanDraft((d) => ({ ...d, lenderName: e.target.value }))} />
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
      accessorKey: 'balance', header: 'Balance',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-loan-balance`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={loanDraft.balance ?? row.original.balance}
              onChange={(v) => setLoanDraft((d) => ({ ...d, balance: v }))}
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
              defaultValue={Number(((loanDraft.interestRate ?? row.original.interestRate) * 100).toFixed(3))}
              onChange={(e) => setLoanDraft((d) => ({ ...d, interestRate: Number(e.target.value) / 100 }))} />
          );
        }
        return `${(row.original.interestRate * 100).toFixed(2)}%`;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 130,
      cell: ({ row }) => rowActions(
        loanEditId === row.original.id,
        () => { updateRow('loans', row.original.id, loanDraft); cancelLoanEdit(); },
        cancelLoanEdit,
        () => startLoanEdit(row.original),
        () => removeRow('loans', row.original.id),
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [loanEditId, loanDraft, state.loans, disabled]);

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
  ], [state.pendingItems, disabled]);

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
