import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

import { useInvestments }          from '../../hooks/useInvestments';
import { useInvestmentIncomeAll }  from '../../hooks/useInvestmentIncomeAll';
import {
  createInvestment, updateInvestment, deleteInvestment,
} from '../../api/ledger';
import {
  createInvestmentIncome, deleteInvestmentIncome,
} from '../../api/income';
import { formatCurrency }          from '../../utils/format';
import { PageInfoTooltip }         from '../../components/PageInfoTooltip';
import { LedgerTable, type RowVariant } from '../../components/LedgerTable';
import { BankSearchInput }         from '../../components/BankSearchInput';

import type {
  BankDto, InvestmentResponseDto,
  UpdateInvestmentRequest, CreateInvestmentRequest,
} from '../../types/ledger';
import type { InvestmentIncomeResponseDto } from '../../types';

import './InvestingPage.css';
import '../Accounting/AccountingPage.css';

// ── Constants ─────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEAR_OPTIONS = Array.from(
  { length: 11 },
  (_, i) => new Date().getFullYear() - 5 + i,
);

const INV_TYPE_LIST = [
  { value: 'Retirement401k', label: '401(k)' },
  { value: 'RothIRA',        label: 'Roth IRA' },
  { value: 'TraditionalIRA', label: 'Traditional IRA' },
  { value: 'Brokerage',      label: 'Brokerage' },
  { value: 'HSA',            label: 'HSA' },
  { value: 'Crypto',         label: 'Crypto' },
  { value: 'Other',          label: 'Other' },
];

const INV_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INV_TYPE_LIST.map(t => [t.value, t.label]),
);

const INCOME_TYPES = ['Dividend', 'Interest', 'Rental', 'Royalty', 'Other'];

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
  const inputRef  = useRef<HTMLInputElement>(null);
  const cursorPos = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (cursorPos.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPos.current, cursorPos.current);
      cursorPos.current = null;
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const distFromEnd = el.value.length - (el.selectionEnd ?? el.value.length);
    const raw = el.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length > 1 ? `${intPart}.${parts[1].slice(0, 2)}` : intPart;
    cursorPos.current = Math.max(0, formatted.length - distFromEnd);
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
      ref={inputRef}
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="0.00"
    />
  );
}

// ── BankCell ──────────────────────────────────────────────────

function BankCell({ logoUrl, name }: { logoUrl?: string | null; name?: string | null }) {
  const [imgSrc, setImgSrc] = useState(logoUrl ?? null);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }}
          onError={() => {
            if (name) {
              setImgSrc(`https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/\s+/g, '')}.com&sz=64`);
            } else {
              setImgSrc(null);
            }
          }}
        />
      )}
      <span>{name ?? '—'}</span>
    </span>
  );
}

// ── Compound growth ───────────────────────────────────────────

function projectGrowth(monthly: number, annualRate: number, years: number, startingValue: number) {
  const r = annualRate / 100 / 12;
  let value = startingValue;
  let contributed = 0;
  const data: { label: string; totalValue: number; contributed: number }[] = [];
  data.push({ label: 'Today', totalValue: Math.round(value), contributed: Math.round(startingValue) });
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) {
      data.push({
        label: `Yr ${m / 12}`,
        totalValue: Math.round(value),
        contributed: Math.round(startingValue + contributed),
      });
    }
  }
  return data;
}

// ── Line chart tooltip ────────────────────────────────────────

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="inv-tooltip">
      <div className="inv-tooltip__label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="inv-tooltip__row">
          <span className="inv-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── InvestingPage ─────────────────────────────────────────────

export function InvestingPage() {
  const qc = useQueryClient();

  // ── Server data
  const { data: investments = [], isLoading: invLoading }     = useInvestments();
  const { data: incomeAll   = [], isLoading: passiveLoading } = useInvestmentIncomeAll();

  // ── Summary stats
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const totalPortfolio = useMemo(
    () => investments.reduce((s, i) => s + i.currentValue, 0),
    [investments],
  );

  const monthlyPassive = useMemo(
    () => incomeAll
      .filter(r => {
        const d = new Date(r.receivedDate);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      })
      .reduce((s, r) => s + r.amount, 0),
    [incomeAll, currentMonth, currentYear],
  );

  const yearlyPassive = useMemo(
    () => incomeAll
      .filter(r => new Date(r.receivedDate).getFullYear() === currentYear)
      .reduce((s, r) => s + r.amount, 0),
    [incomeAll, currentYear],
  );

  // ── Investment inline edit state
  const [invEditId,   setInvEditId]   = useState<string | null>(null);
  const [invDraft,    setInvDraft]    = useState<Partial<UpdateInvestmentRequest>>({});
  const [invEditBank, setInvEditBank] = useState<BankDto | null>(null);
  const [invSaving,   setInvSaving]   = useState(false);
  const invDraftRef    = useRef(invDraft);
  invDraftRef.current  = invDraft;
  const invEditBankRef = useRef(invEditBank);
  invEditBankRef.current = invEditBank;

  function startInvEdit(row: InvestmentResponseDto) {
    setInvEditId(row.id);
    setInvDraft({
      customLabel:    row.customLabel,
      investmentType: row.investmentType,
      currentValue:   row.currentValue,
      bankId:         row.bankId,
      ticker:         row.ticker,
    });
    setInvEditBank(
      row.bankId
        ? { id: row.bankId, name: row.bankName ?? '', logoUrl: row.bankLogoUrl, type: '' }
        : null,
    );
  }

  async function saveInvEdit(row: InvestmentResponseDto) {
    const d = invDraftRef.current;
    setInvSaving(true);
    try {
      await updateInvestment(row.id, {
        customLabel:    d.customLabel    ?? row.customLabel,
        investmentType: d.investmentType ?? row.investmentType,
        currentValue:   d.currentValue   ?? row.currentValue,
        bankId:  'bankId'  in d ? d.bankId  : row.bankId,
        ticker:  'ticker'  in d ? d.ticker  : row.ticker,
      });
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setInvEditId(null);
      setInvDraft({});
      setInvEditBank(null);
    } finally {
      setInvSaving(false);
    }
  }

  function cancelInvEdit() {
    setInvEditId(null);
    setInvDraft({});
    setInvEditBank(null);
  }

  async function handleDeleteInv(row: InvestmentResponseDto) {
    if (!confirm(`Delete "${row.customLabel}"?`)) return;
    await deleteInvestment(row.id);
    qc.invalidateQueries({ queryKey: ['investments'] });
    qc.invalidateQueries({ queryKey: ['networth'] });
  }

  // ── Investment add form
  const [showAddInv,  setShowAddInv]  = useState(false);
  const [addInvForm,  setAddInvForm]  = useState<CreateInvestmentRequest>({
    customLabel: '', investmentType: 'Brokerage', currentValue: 0, ticker: null,
  });
  const [addInvBank,  setAddInvBank]  = useState<BankDto | null>(null);
  const [addInvKey,   setAddInvKey]   = useState(0);
  const [addingInv,   setAddingInv]   = useState(false);

  async function handleAddInvestment() {
    if (!addInvForm.customLabel.trim()) return;
    setAddingInv(true);
    try {
      await createInvestment({ ...addInvForm, bankId: addInvBank?.id ?? null });
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['networth'] });
      setAddInvForm({ customLabel: '', investmentType: 'Brokerage', currentValue: 0, ticker: null });
      setAddInvBank(null);
      setAddInvKey(k => k + 1);
      setShowAddInv(false);
    } finally {
      setAddingInv(false);
    }
  }

  // ── Investment columns
  const investmentColumns = useMemo<ColumnDef<InvestmentResponseDto, unknown>[]>(() => [
    {
      id: 'bank', header: 'Bank', accessorKey: 'bankName',
      cell: ({ row }) => {
        if (invEditId === row.original.id) {
          return (
            <BankSearchInput
              value={invEditBankRef.current}
              onChange={(b) => {
                setInvEditBank(b);
                setInvDraft(d => ({ ...d, bankId: b?.id ?? null }));
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
        if (invEditId === row.original.id) {
          return (
            <input
              key={`${row.original.id}-inv-label`}
              className="lt__edit-input lt__edit-input--wide"
              defaultValue={invDraft.customLabel ?? row.original.customLabel}
              onChange={e => setInvDraft(d => ({ ...d, customLabel: e.target.value }))}
            />
          );
        }
        return row.original.customLabel;
      },
    },
    {
      accessorKey: 'investmentType', header: 'Type',
      cell: ({ row }) => {
        if (invEditId === row.original.id) {
          return (
            <select
              className="lt__edit-select"
              value={invDraft.investmentType ?? row.original.investmentType}
              onChange={e => setInvDraft(d => ({ ...d, investmentType: e.target.value }))}
            >
              {INV_TYPE_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          );
        }
        return INV_TYPE_LABELS[row.original.investmentType] ?? row.original.investmentType;
      },
    },
    {
      accessorKey: 'currentValue', header: 'Value',
      cell: ({ row }) => {
        if (invEditId === row.original.id) {
          return (
            <CurrencyInput
              key={`${row.original.id}-inv-value`}
              className="lt__edit-input lt__edit-input--number"
              defaultValue={invDraft.currentValue ?? row.original.currentValue}
              onChange={v => setInvDraft(d => ({ ...d, currentValue: v }))}
            />
          );
        }
        return <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.currentValue)}</span>;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 140,
      cell: ({ row }) => {
        if (invEditId === row.original.id) {
          return (
            <div className="lt__action-group">
              <button
                className="lt__action-btn lt__action-btn--apply"
                onClick={() => saveInvEdit(row.original)}
                disabled={invSaving}
              >
                {invSaving ? '…' : 'Save'}
              </button>
              <button className="lt__action-btn lt__action-btn--cancel" onClick={cancelInvEdit}>
                Cancel
              </button>
            </div>
          );
        }
        return (
          <div className="lt__action-group">
            <button className="lt__action-btn lt__action-btn--edit" onClick={() => startInvEdit(row.original)}>
              Edit
            </button>
            <button className="lt__action-btn lt__action-btn--delete" onClick={() => handleDeleteInv(row.original)}>
              ✕
            </button>
          </div>
        );
      },
    },
  ], [invEditId, invDraft.investmentType, invSaving]);

  const investmentTotals = useMemo(() => ({
    currentValue: <span className="acc-amount acc-amount--positive">{formatCurrency(totalPortfolio)}</span>,
  }), [totalPortfolio]);

  const sortedInvestments = useMemo(
    () => [...investments].sort((a, b) => b.currentValue - a.currentValue),
    [investments],
  );

  // ── Passive income add form
  const [showAddIncome,  setShowAddIncome]  = useState(false);
  const [addIncomeForm,  setAddIncomeForm]  = useState({
    sourceName: '', type: 'Dividend', amount: 0,
    month: currentMonth, year: currentYear,
  });
  const [addIncomeKey,   setAddIncomeKey]   = useState(0);
  const [addingIncome,   setAddingIncome]   = useState(false);

  async function handleAddIncome() {
    if (!addIncomeForm.sourceName.trim() || addIncomeForm.amount <= 0) return;
    setAddingIncome(true);
    try {
      await createInvestmentIncome({
        sourceName:   addIncomeForm.sourceName.trim(),
        type:         addIncomeForm.type,
        amount:       addIncomeForm.amount,
        receivedDate: new Date(addIncomeForm.year, addIncomeForm.month - 1, 1).toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['investmentIncome', 'all'] });
      qc.invalidateQueries({ queryKey: ['passiveIncome'] });
      setAddIncomeForm({ sourceName: '', type: 'Dividend', amount: 0, month: currentMonth, year: currentYear });
      setAddIncomeKey(k => k + 1);
      setShowAddIncome(false);
    } finally {
      setAddingIncome(false);
    }
  }

  async function handleDeleteIncome(id: string) {
    if (!confirm('Remove this passive income entry?')) return;
    await deleteInvestmentIncome(id);
    qc.invalidateQueries({ queryKey: ['investmentIncome', 'all'] });
    qc.invalidateQueries({ queryKey: ['passiveIncome'] });
  }

  // ── Passive income columns
  const incomeColumns = useMemo<ColumnDef<InvestmentIncomeResponseDto, unknown>[]>(() => [
    { accessorKey: 'sourceName', header: 'Source' },
    { accessorKey: 'typeLabel',  header: 'Type' },
    {
      accessorKey: 'amount', header: 'Amount',
      cell: ({ row }) => (
        <span className="acc-amount acc-amount--positive">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: 'receivedDate', header: 'Date',
      cell: ({ row }) => {
        const d = new Date(row.original.receivedDate);
        return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      },
    },
    {
      id: '_actions', header: '', enableSorting: false, size: 60,
      cell: ({ row }) => (
        <div className="lt__action-group">
          <button
            className="lt__action-btn lt__action-btn--delete"
            onClick={() => handleDeleteIncome(row.original.id)}
          >
            ✕
          </button>
        </div>
      ),
    },
  ], []);

  const sortedIncome = useMemo(
    () => [...incomeAll].sort(
      (a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime(),
    ),
    [incomeAll],
  );

  // ── Compound Growth Projector
  const [projMonthly, setProjMonthly] = useState(500);
  const [projRate,    setProjRate]    = useState(7);
  const [projYears,   setProjYears]   = useState(30);
  const [projData,    setProjData]    = useState<ReturnType<typeof projectGrowth> | null>(null);

  const handleSeeProjection = () => {
    setProjData(projectGrowth(projMonthly, projRate, projYears, totalPortfolio));
  };

  const finalProj = projData ? projData[projData.length - 1] : null;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="inv-page">

      <header className="inv-header">
        <h1 className="inv-title">
          Investing
          <PageInfoTooltip content={
            <>
              <p>Track your investments and the passive income they generate. This is your river — watch it grow.</p>
              <p>Log every investment account and every dividend, rental payment, or distribution received. The goal: build passive income until it covers your biggest liabilities.</p>
              <p><strong>The rule:</strong> big liabilities should be bought with passive income — never active income. If your river can't pay for it, you can't afford it.</p>
            </>
          } />
        </h1>
      </header>

      {/* ── Summary bar ──────────────────────────────────────── */}
      <div className="acc-summary-bar">
        <div className="acc-summary-item">
          <span className="acc-summary-label">Portfolio Value</span>
          <span className="acc-summary-value acc-summary-value--positive">
            {invLoading ? '—' : formatCurrency(totalPortfolio)}
          </span>
        </div>
        <div className="acc-summary-divider" />
        <div className="acc-summary-item">
          <span className="acc-summary-label">Monthly Passive Income</span>
          <span className="acc-summary-value acc-summary-value--positive">
            {passiveLoading ? '—' : formatCurrency(monthlyPassive)}
          </span>
        </div>
        <div className="acc-summary-divider" />
        <div className="acc-summary-item">
          <span className="acc-summary-label">Yearly Passive Income</span>
          <span className="acc-summary-value acc-summary-value--positive">
            {passiveLoading ? '—' : formatCurrency(yearlyPassive)}
          </span>
        </div>
      </div>

      {/* ── Investment Accounts ───────────────────────────────── */}
      <div className="acc-section">
        <div className="acc-section-header">
          <span className="acc-section-title">Investment Accounts</span>
          <button className="acc-btn-add" type="button" onClick={() => setShowAddInv(v => !v)}>
            {showAddInv ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
        <LedgerTable
          data={sortedInvestments}
          columns={investmentColumns}
          getRowVariant={() => 'asset' as RowVariant}
          totals={investmentTotals}
          isLoading={invLoading}
          emptyMessage="No investment accounts yet."
        />
        {showAddInv && (
          <div className="acc-add-form">
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <BankSearchInput
                value={addInvBank}
                onChange={(b) => { setAddInvBank(b); setAddInvForm(f => ({ ...f, bankId: b?.id ?? null })); }}
                placeholder="Brokerage (optional)"
              />
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <input
                className="acc-add-input"
                placeholder="Label *"
                value={addInvForm.customLabel}
                onChange={e => setAddInvForm(f => ({ ...f, customLabel: e.target.value }))}
              />
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <select
                className="acc-add-select"
                value={addInvForm.investmentType}
                onChange={e => setAddInvForm(f => ({ ...f, investmentType: e.target.value }))}
              >
                {INV_TYPE_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">Value ($)</span>
              <CurrencyInput
                key={addInvKey}
                className="acc-add-input acc-add-input--number"
                onChange={v => setAddInvForm(f => ({ ...f, currentValue: v }))}
              />
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <button
                className="acc-btn acc-btn--primary acc-btn--sm"
                type="button"
                onClick={handleAddInvestment}
                disabled={addingInv}
              >
                {addingInv ? 'Adding…' : 'Add Investment'}
              </button>
            </label>
          </div>
        )}
      </div>

      {/* ── Passive Income Entries ────────────────────────────── */}
      <div className="acc-section">
        <div className="acc-section-header">
          <span className="acc-section-title">Passive Income Entries</span>
          <button className="acc-btn-add" type="button" onClick={() => setShowAddIncome(v => !v)}>
            {showAddIncome ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
        <LedgerTable
          data={sortedIncome}
          columns={incomeColumns}
          getRowVariant={() => 'asset' as RowVariant}
          isLoading={passiveLoading}
          emptyMessage="No passive income entries yet."
        />
        {showAddIncome && (
          <div className="acc-add-form">
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <input
                className="acc-add-input"
                placeholder="Source (e.g. SCHD Dividend) *"
                value={addIncomeForm.sourceName}
                onChange={e => setAddIncomeForm(f => ({ ...f, sourceName: e.target.value }))}
                style={{ minWidth: 200 }}
              />
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <select
                className="acc-add-select"
                value={addIncomeForm.type}
                onChange={e => setAddIncomeForm(f => ({ ...f, type: e.target.value }))}
              >
                {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">Amount ($)</span>
              <CurrencyInput
                key={addIncomeKey}
                className="acc-add-input acc-add-input--number"
                onChange={v => setAddIncomeForm(f => ({ ...f, amount: v }))}
              />
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">Month</span>
              <select
                className="acc-add-select"
                value={addIncomeForm.month}
                onChange={e => setAddIncomeForm(f => ({ ...f, month: +e.target.value }))}
              >
                {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">Year</span>
              <select
                className="acc-add-select"
                value={addIncomeForm.year}
                onChange={e => setAddIncomeForm(f => ({ ...f, year: +e.target.value }))}
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="acc-add-field">
              <span className="acc-add-field-label">&nbsp;</span>
              <button
                className="acc-btn acc-btn--primary acc-btn--sm"
                type="button"
                onClick={handleAddIncome}
                disabled={addingIncome}
              >
                {addingIncome ? 'Adding…' : 'Add Entry'}
              </button>
            </label>
          </div>
        )}
      </div>

      {/* ── Compound Growth Projector ─────────────────────────── */}
      <section className="inv-section">
        <div className="inv-section-header">
          <h2 className="inv-section-title">Compound Growth Projector</h2>
          <span className="inv-section-sub">Projects forward from your current portfolio value</span>
        </div>

        <div className="inv-projector">
          <div className="inv-projector__controls">
            <div className="inv-projector__control">
              <label>Starting Value</label>
              <div className="inv-projector__input-wrap inv-projector__input-wrap--readonly">
                <span>$</span>
                <input
                  type="text"
                  readOnly
                  value={totalPortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
              </div>
              <span className="inv-projector__hint">From your portfolio above</span>
            </div>

            <div className="inv-projector__control">
              <label>Monthly Contribution</label>
              <div className="inv-projector__input-wrap">
                <span>$</span>
                <input
                  type="number" min={0} step={50}
                  value={projMonthly}
                  onChange={e => setProjMonthly(parseFloat(e.target.value) || 0)}
                />
              </div>
              <span className="inv-projector__hint" />
            </div>

            <div className="inv-projector__control">
              <label>Expected Annual Return</label>
              <div className="inv-projector__input-wrap">
                <input
                  type="number" min={0} max={50} step={0.5}
                  value={projRate}
                  onChange={e => setProjRate(parseFloat(e.target.value) || 0)}
                />
                <span>%</span>
              </div>
              <span className="inv-projector__hint" />
            </div>

            <div className="inv-projector__control">
              <label>Time Horizon</label>
              <div className="inv-projector__input-wrap">
                <input
                  type="number" min={1} max={60} step={1}
                  value={projYears}
                  onChange={e => setProjYears(parseInt(e.target.value, 10) || 1)}
                />
                <span>years</span>
              </div>
              <span className="inv-projector__hint" />
            </div>
          </div>

          <button className="inv-btn inv-btn--blue-wave inv-projector__cta" onClick={handleSeeProjection}>
            See Projection →
          </button>

          {projData && (
            <>
              <div className="inv-projector__chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={projData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      interval={Math.max(1, Math.floor(projData.length / 7))}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false} tickLine={false} width={64}
                      tickFormatter={v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`}
                    />
                    <Tooltip content={<LineTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }} />
                    <ReferenceLine x="Today" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                    <Line
                      type="monotone" dataKey="totalValue" name="Total w/ Growth"
                      stroke="var(--color-positive)" strokeWidth={2.5}
                      dot={false} activeDot={{ r: 5, fill: 'var(--color-positive)' }}
                    />
                    <Line
                      type="monotone" dataKey="contributed" name="Contributions Only"
                      stroke="var(--color-text-muted)" strokeWidth={1.5} strokeDasharray="5 3"
                      dot={false} activeDot={{ r: 4, fill: 'var(--color-text-muted)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {finalProj && (
                <div className="inv-projector__summary">
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">
                      In {projYears} year{projYears !== 1 ? 's' : ''}
                    </span>
                    <span className="inv-projector__summary-value inv-projector__summary-value--gold">
                      {formatCurrency(finalProj.totalValue)}
                    </span>
                  </div>
                  <div className="inv-projector__summary-divider" />
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">Contributions total</span>
                    <span className="inv-projector__summary-value">
                      {formatCurrency(finalProj.contributed)}
                    </span>
                  </div>
                  <div className="inv-projector__summary-divider" />
                  <div className="inv-projector__summary-item">
                    <span className="inv-projector__summary-label">Compound growth</span>
                    <span className="inv-projector__summary-value inv-projector__summary-value--positive">
                      {formatCurrency(finalProj.totalValue - finalProj.contributed)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

    </div>
  );
}
