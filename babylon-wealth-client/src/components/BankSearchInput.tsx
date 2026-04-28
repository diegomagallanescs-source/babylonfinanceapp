import { useState, useEffect, useRef, useCallback } from 'react';
import { searchBanks } from '../api/banks';
import type { BankDto } from '../types/ledger';
import './BankSearchInput.css';

interface BankSearchInputProps {
  value: BankDto | null;
  onChange: (bank: BankDto | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BankSearchInput({ value, onChange, placeholder = 'Search bank…', disabled }: BankSearchInputProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<BankDto[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the text input in sync when the parent clears the selection
  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    searchBanks(q)
      .then((banks) => {
        setResults(banks);
        setOpen(banks.length > 0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    // Clear selection when user types
    if (value) onChange(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (bank: BankDto) => {
    onChange(bank);
    setQuery(bank.name);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="bsi" ref={containerRef}>
      <div className={`bsi__field ${value ? 'bsi__field--selected' : ''}`}>
        {value?.logoUrl && (
          <img className="bsi__selected-logo" src={value.logoUrl} alt={value.name} />
        )}
        <input
          className="bsi__input"
          type="text"
          value={query}
          onChange={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => { if (results.length > 0) setOpen(true); }}
        />
        {loading && <span className="bsi__spinner" />}
        {value && !disabled && (
          <button className="bsi__clear" onClick={handleClear} type="button" aria-label="Clear">
            ✕
          </button>
        )}
      </div>

      {open && (
        <ul className="bsi__dropdown" role="listbox">
          {results.map((bank) => (
            <li
              key={bank.id}
              className="bsi__option"
              role="option"
              onMouseDown={() => handleSelect(bank)}
            >
              {bank.logoUrl ? (
                <img className="bsi__logo" src={bank.logoUrl} alt={bank.name} />
              ) : (
                <span className="bsi__logo-placeholder">{bank.name[0]}</span>
              )}
              <span className="bsi__name">{bank.name}</span>
              <span className="bsi__type">{bank.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
