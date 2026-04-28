import type { TimePeriod } from '../types';
import { ALL_PERIODS } from '../utils/periods';
import './TimePeriodSelector.css';

interface Props {
  value: TimePeriod;
  onChange: (p: TimePeriod) => void;
}

export function TimePeriodSelector({ value, onChange }: Props) {
  return (
    <div className="period-selector">
      {ALL_PERIODS.map((p) => (
        <button
          key={p}
          className={`period-btn${value === p ? ' period-btn--active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
