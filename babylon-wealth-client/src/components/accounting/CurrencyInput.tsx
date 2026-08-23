import { useState, useRef, useLayoutEffect } from 'react';

/** Strips grouping commas, leaving digits and the decimal point. */
function digitsOf(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

/** Just the digits — used to tell a separator deletion apart from a real one. */
function bareDigits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/** Adds thousands separators and clamps to two decimal places. */
function group(raw: string): string {
  const parts = raw.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${intPart}.${parts[1].slice(0, 2)}` : intPart;
}

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
  const lastKey   = useRef<string | null>(null);

  // Restore cursor synchronously before the browser paints
  useLayoutEffect(() => {
    if (cursorPos.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPos.current, cursorPos.current);
      cursorPos.current = null;
    }
  });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    lastKey.current = e.key;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    let working = el.value;
    let caret = el.selectionEnd ?? working.length;

    // Commas and the decimal point are structural, and deleting one does the wrong thing:
    // grouping regenerates a comma, so the keystroke becomes a permanent no-op (which bites
    // the moment you type at the front of a number, leaving the caret just after a comma),
    // and dropping the point silently multiplies the amount by 100. Either way, take the
    // adjacent digit instead — that is what the keystroke was aimed at.
    const removedOneChar = text.length - working.length === 1;
    if (removedOneChar && bareDigits(working) === bareDigits(text)) {
      // The browser removed the character now sitting at `caret` in the previous text.
      // Rebuild from that text so the separator survives and a digit goes instead.
      const forward = lastKey.current === 'Delete';
      let victim = -1;
      for (
        let i = forward ? caret : caret - 1;
        forward ? i < text.length : i >= 0;
        forward ? i++ : i--
      ) {
        if (text[i] >= '0' && text[i] <= '9') { victim = i; break; }
      }

      if (victim >= 0) {
        working = text.slice(0, victim) + text.slice(victim + 1);
        caret = victim;
      } else {
        // No digit on that side (a leading separator) — leave the value untouched.
        working = text;
        caret = Math.max(0, caret);
      }
    }

    // Measure from the right so commas shifting position don't throw the caret off.
    const distFromEnd = working.length - caret;
    const raw = digitsOf(working);
    const formatted = group(raw);

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
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
