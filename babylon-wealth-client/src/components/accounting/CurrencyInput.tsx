import { useState, useRef, useLayoutEffect } from 'react';

/**
 * Text input that formats as you type ("12,345.67") while reporting a plain number.
 * Shared by the Accounting tab and the Projections workspace so both edit money identically.
 */
export function CurrencyInput({
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

  // Restore cursor synchronously before the browser paints
  useLayoutEffect(() => {
    if (cursorPos.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPos.current, cursorPos.current);
      cursorPos.current = null;
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    // Measure from the right so comma shifts don't throw off position
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
      placeholder="0.00"
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
