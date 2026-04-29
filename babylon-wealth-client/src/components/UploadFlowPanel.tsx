import { useState, useRef } from 'react';
import apiClient from '../api/client';
import type {
  CheckingStatementResponseDto,
  StatementAnalysisResponseDto,
  SelectedPeriod,
} from '../types/statements';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR_OPTIONS = Array.from({ length: 31 }, (_, i) => 2020 + i);

interface UploadFlowPanelProps {
  mode: 'checking' | 'credit';
  onResult: (result: CheckingStatementResponseDto | StatementAnalysisResponseDto) => void;
  onPeriodChange: (period: SelectedPeriod) => void;
}

export function UploadFlowPanel({ mode, onResult, onPeriodChange }: UploadFlowPanelProps) {
  const now = new Date();
  const [importMode, setImportMode] = useState<'monthly' | 'year-end'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const periodLabel =
    importMode === 'monthly'
      ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      : `${selectedYear} Year-End`;

  const canStart = files.length > 0;

  const addFiles = (incoming: File[]) => {
    const pdfs = incoming.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfs]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const removeFile = (index: number) =>
    setFiles(prev => prev.filter((_, i) => i !== index));

  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    setError(null);

    const period: SelectedPeriod = {
      mode: importMode,
      month: importMode === 'monthly' ? selectedMonth : null,
      year: selectedYear,
      label: periodLabel,
    };
    onPeriodChange(period);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const endpoint =
      mode === 'checking' ? '/statements/analyze-checking' : '/statements/analyze';

    try {
      const { data } = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.transactionCount === 0) {
        setError(
          'No transactions were detected in the uploaded PDF(s). ' +
          'Please check that you uploaded a valid statement and try again.',
        );
        return;
      }

      onResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-flow-panel">
      <h3 className="upload-flow-panel__title">New Import</h3>

      {/* Import type toggle */}
      <div className="upload-flow-panel__section-label">Import Type</div>
      <div className="mode-toggle">
        {(['monthly', 'year-end'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`mode-card${importMode === m ? ' mode-card--active' : ''}`}
            onClick={() => setImportMode(m)}
          >
            <strong>{m === 'monthly' ? 'Monthly' : 'Year-End'}</strong>
            <span>
              {m === 'monthly' ? "One month's statements" : 'Full year or all months'}
            </span>
          </button>
        ))}
      </div>

      {/* Period picker */}
      <div className="upload-flow-panel__section-label">Period</div>
      <div className="period-picker">
        {importMode === 'monthly' && (
          <select
            className="period-picker__select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        )}
        <select
          className="period-picker__select"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone${dragOver ? ' drop-zone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          hidden
          onChange={handleBrowse}
        />
        {files.length === 0 ? (
          <p className="drop-zone__prompt">
            📄 Drop PDFs here or <span className="drop-zone__browse-link">browse</span>
            <br />
            <span className="drop-zone__hint">
              {mode === 'checking'
                ? 'Chase, SoFi, Bank of America — any mix'
                : 'Chase, Amex monthly or year-end'}
            </span>
          </p>
        ) : (
          <ul className="file-list" onClick={e => e.stopPropagation()}>
            {files.map((f, i) => (
              <li key={i} className="file-list__item">
                <span className="file-list__name">{f.name}</span>
                <button
                  type="button"
                  className="file-list__remove"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
            <li className="file-list__add-more">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add more files
              </button>
            </li>
          </ul>
        )}
      </div>

      {importMode === 'year-end' && (
        <p className="upload-flow-panel__tip">
          Tip: upload all months at once to backfill a full year in one pass.
        </p>
      )}

      {error && (
        <div className="banner banner--error">{error}</div>
      )}

      <button
        type="button"
        className="btn btn--primary upload-flow-panel__submit"
        disabled={!canStart || loading}
        onClick={handleStart}
      >
        {loading ? 'Analyzing…' : 'Start Analysis →'}
      </button>
    </div>
  );
}
