import { useState, useRef, useEffect } from 'react';
import './PageInfoTooltip.css';

interface Props {
  content: string | React.ReactNode;
}

export function PageInfoTooltip({ content }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span className="pit-wrap" ref={ref}>
      <button
        className="pit-trigger"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        aria-label="Page information"
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="6.25" y="6" width="1.5" height="4.5" rx="0.75" fill="currentColor"/>
          <circle cx="7" cy="3.75" r="0.85" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className="pit-tooltip" role="tooltip">
          {content}
        </div>
      )}
    </span>
  );
}
