import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  createInvestment, updateInvestment, deleteInvestment,
  createPendingItem, settlePendingItem, deletePendingItem,
  createProperty, updateProperty, deleteProperty,
} from '../../api/ledger';

import { LedgerTable, type RowVariant } from '../../components/LedgerTable';
import { BankSearchInput } from '../../components/BankSearchInput';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';

import type {
  BankDto,
  BankAccountResponseDto, CreateBankAccountRequest, UpdateBankAccountRequest,
  CreditCardResponseDto, CreateCreditCardRequest, UpdateCreditCardRequest,
  LoanResponseDto, CreateLoanRequest, UpdateLoanRequest,
  InvestmentResponseDto, CreateInvestmentRequest, UpdateInvestmentRequest,
  PendingItemResponseDto, CreatePendingItemRequest,
  PropertyResponseDto, CreatePropertyRequest, UpdatePropertyRequest,
  BudgetCategoryResponseDto,
} from '../../types/ledger';

import { formatCurrency } from '../../utils/format';
import './AccountingPage.css';

// ── Constants ─────────────────────────────────────────────────
const ACCT_TYPES = ['Checking', 'Savings', 'Money Market', 'CD', 'Other'];
const LOAN_TYPES = ['Mortgage', 'Auto', 'Student', 'Personal', 'HELOC', 'Business', 'Other'];
const INVESTMENT_TYPES = ['Brokerage', 'Retirement401k', 'RothIRA', 'TraditionalIRA', 'HSA', 'Crypto', 'Other'];

// ── CurrencyInput ─────────────────────────────────────────────
function CurrencyInput({
  defaultValue = 0,
  onChange,
  className,
}: {
  defaultValue?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(
    defaultValue > 0
      ? defaultValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '',
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length > 1 ? `${intPart}.${parts[1].slice(0, 2)}` : intPart;
    setText(formatted);
    const num = parseFloat(raw);
    onChange(isNaN(num) ? 0 : num);
  }

  function handleBlur() {
    const num = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      setText(num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder="0.00"
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

// ── Small display helpers ─────────────────────────────────────
function resolveLogo(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('logo.clearbit.com/')) {
    const domain = url.split('logo.clearbit.com/')[1];
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  return url;
}

function BankCell({ logoUrl, name }: { logoUrl: string | null; name: string | null }) {
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

function CategoryPill({ cat }: { cat: BudgetCategoryResponseDto | undefined }) {
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

// ── Deal signal helper ────────────────────────────────────────
function getDealSignal(p: PropertyResponseDto): 'green' | 'yellow' | 'red' {
  const annualNOI = (p.monthlyRent - p.monthlyExpenses) * 12;
  const capRate = p.purchasePrice > 0 ? (annualNOI / p.purchasePrice) * 100 : 0;
  if (p.monthlyCashFlow > 0 && capRate >= 5) return 'green';
  if (p.monthlyCashFlow > 0 || capRate >= 4) return 'yellow';
  return 'red';
}

const SIGNAL_LABEL = { green: '🟢 Strong Deal', yellow: '🟡 Marginal', red: '🔴 Weak Deal' };

// ── PropertyCard ──────────────────────────────────────────────
function PropertyCard({
  property,
  onAnalyze,
  onDelete,
  onSaved,
}: {
  property: PropertyResponseDto;
  onAnalyze: (p: PropertyResponseDto) => void;
  onDelete: (p: PropertyResponseDto) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdatePropertyRequest>({});
  const [saving, setSaving] = useState(false);
  const signal = getDealSignal(property);

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

  async function handleSave() {
    setSaving(true);
    try {
      await updateProperty(property.id, draft);
      onSaved();
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, key: keyof UpdatePropertyRequest, prefix = '') {
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
        {prefix && <span className="acc-prop-edit-suffix">{prefix}</span>}
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
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
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
        <span className="acc-amount acc-amount--positive">{formatCurrency(property.equity)}</span>
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
        <span className={`acc-amount ${property.monthlyCashFlow >= 0 ? 'acc-amount--positive' : 'acc-amount--negative'}`}>
          {property.monthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(property.monthlyCashFlow)}/mo
        </span>
      </div>
      <div className="acc-prop-card-actions">
        <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button" onClick={startEdit}>Edit</button>
        <button className="acc-btn acc-btn--primary acc-btn--sm" type="button" onClick={() => onAnalyze(property)}>
          Analyze →
        </button>
        <button className="acc-btn acc-btn--danger acc-btn--sm" type="button" onClick={() => onDelete(property)}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── PropertiesPanel ───────────────────────────────────────────
function PropertiesPanel({
  properties,
  isLoading,
  onAnalyze,
  onDelete,
  onSaved,
}: {
  properties: PropertyResponseDto[];
  isLoading: boolean;
  onAnalyze: (p: PropertyResponseDto) => void;
  onDelete: (p: PropertyResponseDto) => void;
  onSaved: () => void;
}) {
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
        <PropertyCard
          key={p.id}
          property={p}
          onAnalyze={onAnalyze}
          onDelete={onDelete}
          onSaved={onSaved}
        />
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

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // ── Bank Accounts ─────────────────────────────────────────
  const [dirtyAccounts, setDirtyAccounts] = useState<Map<string, UpdateBankAccountRequest>>(new Map());
  const [acctEditId, setAcctEditId] = useState<string | null>(null);
  const [acctDraft, setAcctDraft] = useState<Partial<UpdateBankAccountRequest>>({});
  const [acctEditBank, setAcctEditBank] = useState<BankDto | null>(null);
  const acctDraftRef = useRef(acctDraft);
  acctDraftRef.current = acctDraft;
  const acctEditBankRef = useRef(acctEditBank);
  acctEditBankRef.current = acctEditBank;

  const [showAddAcct, setShowAddAcct] = useState(false);
  const [addAcctForm, setAddAcctForm] = useState<CreateBankAccountRequest>({
    customLabel: '', balance: 0, accountType: 'Checking', bankId: null, budgetCategoryId: null,
  });
  const [addAcctBank, setAddAcctBank] = useState<BankDto | null>(null);
  const [addingAcct, setAddingAcct] = useState(false);

  function startAcctEdit(row: BankAccountResponseDto) {
    const existing = dirtyAccounts.get(row.id);
    setAcctEditId(row.id);
    setAcctDraft(existing ?? {
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
    const d = acctDraftRef.current;
    const update: UpdateBankAccountRequest = {
      customLabel: d.customLabel ?? row.customLabel,
      balance: d.balance ?? row.balance,
      accountType: d.accountType ?? row.accountType,
      bankId: 'bankId' in d ? d.bankId : row.bankId,
      budgetCategoryId: 'budgetCategoryId' in d ? d.budgetCategoryId : row.budgetCategoryId,
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
  const cardDraftRef = useRef(cardDraft);
  cardDraftRef.current = cardDraft;
  const cardEditBankRef = useRef(cardEditBank);
  cardEditBankRef.current = cardEditBank;

  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardForm, setAddCardForm] = useState<CreateCreditCardRequest>({
    customLabel: '', balance: 0, creditLimit: 0, apr: 0, cardType: 'Personal', bankId: null,
  });
  const [addCardBank, setAddCardBank] = useState<BankDto | null>(null);
  const [addingCard, setAddingCard] = useState(false);

  function startCardEdit(row: CreditCardResponseDto) {
    const existing = dirtyCards.get(row.id);
    setCardEditId(row.id);
    setCardDraft(existing ?? {
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
    const d = cardDraftRef.current;
    const update: UpdateCreditCardRequest = {
      customLabel: d.customLabel ?? row.customLabel,
      balance: d.balance ?? row.balance,
      creditLimit: d.creditLimit ?? row.creditLimit,
      apr: d.apr ?? row.apr,
      bankId: 'bankId' in d ? d.bankId : row.bankId,
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
  const loanDraftRef = useRef(loanDraft);
  loanDraftRef.current = loanDraft;

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addLoanForm, setAddLoanForm] = useState<CreateLoanRequest>({
    customLabel: '', lenderName: '', balance: 0, interestRate: 0, loanType: 'Mortgage',
  });
  const [addingLoan, setAddingLoan] = useState(false);

  function startLoanEdit(row: LoanResponseDto) {
    const existing = dirtyLoans.get(row.id);
    setLoanEditId(row.id);
    setLoanDraft(existing ?? {
      customLabel: row.customLabel,
      lenderName: row.lenderName,
      balance: row.balance,
      interestRate: row.interestRate,
      loanType: row.loanType,
    });
  }

  function applyLoanEdit(row: LoanResponseDto) {
    const d = loanDraftRef.current;
    const update: UpdateLoanRequest = {
      customLabel: d.customLabel ?? row.customLabel,
      lenderName: d.lenderName ?? row.lenderName,
      balance: d.balance ?? row.balance,
      interestRate: d.interestRate ?? row.interestRate,
      loanType: d.loanType ?? row.loanType,
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
  const investDraftRef = useRef(investDraft);
  investDraftRef.current = investDraft;
  const investEditBankRef = useRef(investEditBank);
  investEditBankRef.current = investEditBank;

  const [showAddInvest, setShowAddInvest] = useState(false);
  const [addInvestForm, setAddInvestForm] = useState<CreateInvestmentRequest>({
    customLabel: '', currentValue: 0, investmentType: 'Brokerage', bankId: null, ticker: null,
  });
  const [addInvestBank, setAddInvestBank] = useState<BankDto | null>(null);
  const [addingInvest, setAddingInvest] = useState(false);
  const [addInvestKey, setAddInvestKey] = useState(0);

  function startInvestEdit(row: InvestmentResponseDto) {
    const existing = dirtyInvestments.get(row.id);
    setInvestEditId(row.id);
    setInvestDraft(existing ?? {
      customLabel: row.customLabel,
      currentValue: row.currentValue,
      investmentType: row.investmentType,
      bankId: row.bankId,
      ticker: row.ticker,
    });
    setInvestEditBank(
      row.bankId ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' } : null,
    );
  }

  function applyInvestEdit(row: InvestmentResponseDto) {
    const d = investDraftRef.current;
    const update: UpdateInvestmentRequest = {
      customLabel: d.customLabel ?? row.customLabel,
      currentValue: d.currentValue ?? row.currentValue,
      investmentType: d.investmentType ?? row.investmentType,
      bankId: 'bankId' in d ? d.bankId : row.bankId,
      ticker: 'ticker' in d ? d.ticker : row.ticker,
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

  async function handleDeleteInvestment(row: InvestmentResponseDto) {
    if (!confirm(`Delete "${row.customLabel}"?`)) return;
    await deleteInvestment(row.id);
    qc.invalidateQueries({ queryKey: ['investments'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
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
      setAddInvestKey((k) => k + 1);
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
  const accountColumns = useMemo<ColumnDef<BankAccountResponseDto, unknown>[]>(() => [
    {
      id: 'bank',
      header: 'Bank',
      accessorKey: 'bankName',
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
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (acctEditId === row.original.id) {
          return (
            <input
              key={`${row.original.id}-acct-label`}
              className="lt__edit-input lt__edit-input--wide"
              defaultValue={acctDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setAcctDraft((d) => ({ ...d, customLabel: e.target.value }))}
            />
          );
        }
        return dirtyAccounts.get(row.original.id)?.customLabel ?? row.original.customLabel;
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
        return dirtyAccounts.get(row.original.id)?.accountType ?? row.original.accountType;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
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
        const bal = dirtyAccounts.get(row.original.id)?.balance ?? row.original.balance;
        return <span className="acc-amount acc-amount--positive">{formatCurrency(bal)}</span>;
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
        const catId = dirtyAccounts.get(row.original.id)?.budgetCategoryId ?? row.original.budgetCategoryId;
        const cat = categories.find((c) => c.id === catId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [acctEditId, dirtyAccounts, categories]);

  // ── Credit card columns (inline editing) ─────────────────
  const cardColumns = useMemo<ColumnDef<CreditCardResponseDto, unknown>[]>(() => [
    {
      id: 'bank',
      header: 'Bank',
      accessorKey: 'bankName',
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
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              key={`${row.original.id}-card-label`}
              className="lt__edit-input lt__edit-input--wide"
              defaultValue={cardDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setCardDraft((d) => ({ ...d, customLabel: e.target.value }))}
            />
          );
        }
        return dirtyCards.get(row.original.id)?.customLabel ?? row.original.customLabel;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
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
        const bal = dirtyCards.get(row.original.id)?.balance ?? row.original.balance;
        return <span className="acc-amount acc-amount--negative">{formatCurrency(bal)}</span>;
      },
    },
    {
      accessorKey: 'creditLimit',
      header: 'Limit',
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
        return formatCurrency(dirtyCards.get(row.original.id)?.creditLimit ?? row.original.creditLimit);
      },
    },
    {
      accessorKey: 'apr',
      header: 'APR',
      cell: ({ row }) => {
        if (cardEditId === row.original.id) {
          return (
            <input
              key={`${row.original.id}-card-apr`}
              className="lt__edit-input lt__edit-input--number"
              type="number"
              step="0.01"
              placeholder="%"
              style={{ maxWidth: 72 }}
              defaultValue={Number(((cardDraft.apr ?? row.original.apr) * 100).toFixed(2))}
              onChange={(e) => setCardDraft((d) => ({ ...d, apr: Number(e.target.value) / 100 }))}
            />
          );
        }
        const apr = dirtyCards.get(row.original.id)?.apr ?? row.original.apr;
        return `${(apr * 100).toFixed(0)}%`;
      },
    },
    {
      id: 'utilization',
      header: 'Util %',
      enableSorting: false,
      cell: ({ row }) => {
        const dirty = dirtyCards.get(row.original.id);
        return (
          <UtilBadge
            balance={dirty?.balance ?? row.original.balance}
            limit={dirty?.creditLimit ?? row.original.creditLimit}
          />
        );
      },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [cardEditId, dirtyCards]);

  // ── Loan columns (inline editing) ────────────────────────
  const loanColumns = useMemo<ColumnDef<LoanResponseDto, unknown>[]>(() => [
    {
      accessorKey: 'customLabel',
      header: 'Label',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-label`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={loanDraft.customLabel ?? row.original.customLabel}
              onChange={(e) => setLoanDraft((d) => ({ ...d, customLabel: e.target.value }))} />
          );
        }
        return dirtyLoans.get(row.original.id)?.customLabel ?? row.original.customLabel;
      },
    },
    {
      accessorKey: 'lenderName',
      header: 'Lender',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-lender`} className="lt__edit-input lt__edit-input--wide"
              defaultValue={loanDraft.lenderName ?? row.original.lenderName}
              onChange={(e) => setLoanDraft((d) => ({ ...d, lenderName: e.target.value }))} />
          );
        }
        return dirtyLoans.get(row.original.id)?.lenderName ?? row.original.lenderName;
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
        return dirtyLoans.get(row.original.id)?.loanType ?? row.original.loanType;
      },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
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
        const bal = dirtyLoans.get(row.original.id)?.balance ?? row.original.balance;
        return <span className="acc-amount acc-amount--negative">-{formatCurrency(bal)}</span>;
      },
    },
    {
      accessorKey: 'interestRate',
      header: 'Rate',
      cell: ({ row }) => {
        if (loanEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-loan-rate`} className="lt__edit-input lt__edit-input--number"
              type="number" step="0.01" min="0" style={{ maxWidth: 72 }}
              defaultValue={Number(((loanDraft.interestRate ?? row.original.interestRate) * 100).toFixed(3))}
              onChange={(e) => setLoanDraft((d) => ({ ...d, interestRate: Number(e.target.value) / 100 }))} />
          );
        }
        const rate = dirtyLoans.get(row.original.id)?.interestRate ?? row.original.interestRate;
        return `${(rate * 100).toFixed(2)}%`;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [loanEditId, dirtyLoans]);

  // ── Pending Items add form ────────────────────────────────
  const [showAddPending, setShowAddPending] = useState(false);
  const [addPendingForm, setAddPendingForm] = useState<CreatePendingItemRequest>({
    description: '', counterparty: null, amount: 0, dueDate: null,
  });
  const [addingPending, setAddingPending] = useState(false);

  async function handleAddPending() {
    if (!addPendingForm.description.trim()) return;
    setAddingPending(true);
    try {
      await createPendingItem(addPendingForm);
      qc.invalidateQueries({ queryKey: ['pending'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddPendingForm({ description: '', counterparty: null, amount: 0, dueDate: null });
      setShowAddPending(false);
    } finally {
      setAddingPending(false);
    }
  }

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
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ getValue }) => {
        const d = getValue<string | null>();
        return d ? new Date(d).toLocaleDateString() : <span style={{ opacity: 0.4 }}>—</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return <span className={`acc-badge acc-badge--${s.toLowerCase()}`}>{s}</span>;
      },
    },
    {
      id: '_actions',
      header: '',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => {
        if (row.original.status === 'Settled') {
          return (
            <button
              className="lt__action-btn lt__action-btn--delete"
              type="button"
              onClick={() => handleDeletePending(row.original)}
            >
              Delete
            </button>
          );
        }
        return (
          <button
            className="lt__action-btn lt__action-btn--settle"
            type="button"
            onClick={() => handleSettlePending(row.original)}
          >
            Settle
          </button>
        );
      },
    },
  ];

  // ── Investment columns ────────────────────────────────────
  const investmentColumns = useMemo<ColumnDef<InvestmentResponseDto, unknown>[]>(() => [
    {
      id: 'bank', header: 'Bank', accessorKey: 'bankName',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <BankSearchInput
              value={investEditBankRef.current}
              onChange={(bank) => { setInvestEditBank(bank); setInvestDraft((d) => ({ ...d, bankId: bank?.id ?? null })); }}
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
        return dirtyInvestments.get(row.original.id)?.customLabel ?? row.original.customLabel;
      },
    },
    {
      accessorKey: 'ticker', header: 'Ticker',
      cell: ({ row }) => {
        if (investEditId === row.original.id) {
          return (
            <input key={`${row.original.id}-invest-ticker`} className="lt__edit-input"
              defaultValue={investDraft.ticker ?? row.original.ticker ?? ''}
              onChange={(e) => setInvestDraft((d) => ({ ...d, ticker: e.target.value || null }))} />
          );
        }
        return dirtyInvestments.get(row.original.id)?.ticker ?? row.original.ticker ?? '—';
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
        return dirtyInvestments.get(row.original.id)?.investmentType ?? row.original.investmentType;
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
        const val = dirtyInvestments.get(row.original.id)?.currentValue ?? row.original.currentValue;
        return <span className="acc-amount acc-amount--positive">{formatCurrency(val)}</span>;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 140,
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
            <button className="lt__action-btn lt__action-btn--delete" type="button"
              onClick={() => handleDeleteInvestment(row.original)}>Delete</button>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [investEditId, dirtyInvestments]);

  // ── Splits + totals ───────────────────────────────────────
  const businessCards = (cards ?? []).filter((c) => c.cardType === 'Business');
  const personalCards = (cards ?? []).filter((c) => c.cardType === 'Personal');

  const accountTotals = {
    customLabel: 'Total',
    balance: <span className="acc-amount acc-amount--positive">{formatCurrency((accounts ?? []).reduce((s, a) => s + a.balance, 0))}</span>,
  };
  const investmentTotals = {
    customLabel: 'Total',
    currentValue: <span className="acc-amount acc-amount--positive">{formatCurrency((investments ?? []).reduce((s, i) => s + i.currentValue, 0))}</span>,
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

  // ── Properties add form ───────────────────────────────────
  const LOAN_PRODUCT_TYPES = ['Conventional', 'FHA', 'VA', 'DSCR', 'Cash'];
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addPropertyForm, setAddPropertyForm] = useState<CreatePropertyRequest>({
    address: '', purchasePrice: 0, currentEstimatedValue: 0, loanBalance: 0,
    interestRate: 0, loanType: 'Conventional', monthlyRent: 0, monthlyExpenses: 0,
  });
  const [addingProperty, setAddingProperty] = useState(false);

  async function handleAddProperty() {
    if (!addPropertyForm.address.trim()) return;
    setAddingProperty(true);
    try {
      await createProperty(addPropertyForm);
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddPropertyForm({
        address: '', purchasePrice: 0, currentEstimatedValue: 0, loanBalance: 0,
        interestRate: 0, loanType: 'Conventional', monthlyRent: 0, monthlyExpenses: 0,
      });
      setShowAddProperty(false);
    } finally {
      setAddingProperty(false);
    }
  }

  async function handleSettlePending(row: PendingItemResponseDto) {
    if (!confirm(`Mark "${row.description}" as settled?`)) return;
    await settlePendingItem(row.id);
    qc.invalidateQueries({ queryKey: ['pending'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  async function handleDeletePending(row: PendingItemResponseDto) {
    if (!confirm(`Delete "${row.description}"?`)) return;
    await deletePendingItem(row.id);
    qc.invalidateQueries({ queryKey: ['pending'] });
  }

  function handleAnalyzeProperty(p: PropertyResponseDto) {
    navigate('/real-estate', { state: { prefillProperty: p } });
  }

  async function handleDeleteProperty(p: PropertyResponseDto) {
    if (!confirm(`Delete property at "${p.address}"? This cannot be undone.`)) return;
    await deleteProperty(p.id);
    qc.invalidateQueries({ queryKey: ['properties'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="acc-page">
      <div className="acc-header">
        <h1 className="acc-title">
          Accounting
          <PageInfoTooltip content={
            <>
              <p>Your live financial snapshot. Every account, card, loan, and investment lives here — keeping your net worth graph accurate and up to date.</p>
              <p>Numbers must be updated manually by you weekly. Keep balances current so your net worth reflects reality and you always know where your accounts stand.</p>
            </>
          } />
        </h1>
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
                <CurrencyInput
                  className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddAcctForm((f) => ({ ...f, balance: v }))}
                />
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

        {/* ── Investment Accounts ────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Investment Accounts</span>
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
            emptyMessage="No investment accounts yet."
          />
          {showAddInvest && (
            <div className="acc-add-form">
              <label className="acc-add-field">
                <span className="acc-add-field-label">&nbsp;</span>
                <BankSearchInput
                  value={addInvestBank}
                  onChange={(b) => { setAddInvestBank(b); setAddInvestForm((f) => ({ ...f, bankId: b?.id ?? null })); }}
                  placeholder="Brokerage (optional)"
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
                <input className="acc-add-input" placeholder="Ticker (optional)"
                  value={addInvestForm.ticker ?? ''}
                  onChange={(e) => setAddInvestForm((f) => ({ ...f, ticker: e.target.value || null }))} />
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
                <CurrencyInput
                  key={addInvestKey}
                  className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddInvestForm((f) => ({ ...f, currentValue: v }))}
                />
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
                <CurrencyInput
                  className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddCardForm((f) => ({ ...f, balance: v }))}
                />
              </label>
              <label className="acc-add-field">
                <span className="acc-add-field-label">Credit Limit ($)</span>
                <CurrencyInput
                  className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddCardForm((f) => ({ ...f, creditLimit: v }))}
                />
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
                <CurrencyInput
                  className="acc-add-input acc-add-input--number"
                  onChange={(v) => setAddLoanForm((f) => ({ ...f, balance: v }))}
                />
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

        {/* ── Pending Items ─────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Pending Items</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddPending((v) => !v)}>
              {showAddPending ? '✕ Cancel' : '+ Add'}
            </button>
          </div>
          <LedgerTable
            data={(pending ?? []).filter((p) => p.status !== 'Settled')}
            columns={pendingColumns}
            getRowVariant={(row) => row.amount >= 0 ? 'asset' : 'liability'}
            isLoading={loadingPending}
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
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddPending} disabled={addingPending}>
                  {addingPending ? 'Adding…' : 'Add Item'}
                </button>
              </label>
            </div>
          )}
        </div>

        {/* ── Properties ────────────────────────────────── */}
        <div className="acc-section">
          <div className="acc-section-header">
            <span className="acc-section-title">Properties</span>
            <button className="acc-btn-add" type="button" onClick={() => setShowAddProperty((v) => !v)}>
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
                <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
                  onClick={handleAddProperty} disabled={addingProperty}>
                  {addingProperty ? 'Adding…' : 'Add Property'}
                </button>
              </label>
            </div>
          )}
          <PropertiesPanel
            properties={properties ?? []}
            isLoading={loadingProperties}
            onAnalyze={handleAnalyzeProperty}
            onDelete={handleDeleteProperty}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['properties'] });
              qc.invalidateQueries({ queryKey: ['networth'] });
            }}
          />
        </div>

      </div>
    </div>
  );
}
