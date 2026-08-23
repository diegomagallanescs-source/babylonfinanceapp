import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useProjections } from '../../hooks/useProjections';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useLoans } from '../../hooks/useLoans';
import { useInvestments } from '../../hooks/useInvestments';
import { usePendingItems } from '../../hooks/usePendingItems';
import { useProperties } from '../../hooks/useProperties';

import { createProjection, deleteProjection } from '../../api/projections';
import { buildSeedState, formatSnapshotDate } from '../../utils/projectionState';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import { formatCurrency } from '../../utils/format';

import type { ProjectionSummaryDto } from '../../types/projections';

import '../Accounting/AccountingPage.css';
import './ProjectionsPage.css';

export function ProjectionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projections, isLoading } = useProjections();

  // The live ledger, read once so a new projection can open on the same numbers.
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: loans } = useLoans();
  const { data: investments } = useInvestments();
  const { data: pendingItems } = usePendingItems();
  const { data: properties } = useProperties();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createProjection({
        name: name.trim(),
        description: description.trim() || null,
        // One-time copy of the Accounting tab — the projection edits this copy from here on.
        state: buildSeedState({ accounts, investments, creditCards, loans, pendingItems, properties }),
      });
      qc.invalidateQueries({ queryKey: ['projections'] });
      setName('');
      setDescription('');
      setShowCreate(false);
      navigate(`/projections/${created.id}`);
    } catch {
      setError('Could not create the projection. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(p: ProjectionSummaryDto) {
    if (!confirm(`Delete "${p.name}" and all ${p.snapshotCount} of its snapshots? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteProjection(p.id);
      qc.invalidateQueries({ queryKey: ['projections'] });
    } catch {
      setError('Could not delete that projection. Please try again.');
    }
  }

  return (
    <div className="proj-page">
      <div className="proj-page__header">
        <h1 className="acc-title">
          Projections
          <PageInfoTooltip content={
            <>
              <p>Model where your net worth is heading. Each projection opens with a copy of your Accounting tab that you can change freely — the real accounts are never touched.</p>
              <p>Save a snapshot at any date as a <strong>Projection</strong> or as <strong>Realized</strong>, and the two lines let you compare the plan against what actually happened.</p>
            </>
          } />
        </h1>
        <button className="acc-btn acc-btn--primary" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? '✕ Cancel' : '+ New Projection'}
        </button>
      </div>

      {showCreate && (
        <div className="proj-create">
          <label className="proj-create__field">
            <span className="proj-create__label">Title</span>
            <input
              className="acc-add-input"
              value={name}
              maxLength={120}
              placeholder="e.g. Buy a duplex in 2027"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
            />
          </label>
          <label className="proj-create__field proj-create__field--wide">
            <span className="proj-create__label">Short description</span>
            <input
              className="acc-add-input"
              value={description}
              maxLength={300}
              placeholder="What this projection is testing"
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
            />
          </label>
          <button
            className="acc-btn acc-btn--primary"
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {error && <div className="proj-page__error">{error}</div>}

      {isLoading ? (
        <div className="proj-grid">
          {[1, 2, 3].map((i) => <div key={i} className="proj-card proj-card--skeleton" />)}
        </div>
      ) : !projections || projections.length === 0 ? (
        <div className="proj-empty">
          <div className="proj-empty__title">No projections yet</div>
          <p className="proj-empty__body">
            Create one to copy your current accounting into a private workspace, then chart where it goes.
          </p>
          <button className="acc-btn acc-btn--primary" type="button" onClick={() => setShowCreate(true)}>
            + New Projection
          </button>
        </div>
      ) : (
        <div className="proj-grid">
          {projections.map((p) => (
            <div key={p.id} className="proj-card">
              <button
                className="proj-card__open"
                type="button"
                onClick={() => navigate(`/projections/${p.id}`)}
              >
                <div className="proj-card__name">{p.name}</div>
                {p.description && <div className="proj-card__desc">{p.description}</div>}

                <div className="proj-card__stats">
                  <span className="proj-card__stat proj-card__stat--projected">
                    {p.projectedCount} projection{p.projectedCount !== 1 ? 's' : ''}
                  </span>
                  <span className="proj-card__stat proj-card__stat--realized">
                    {p.realizedCount} realized
                  </span>
                </div>

                {p.latestSnapshotDate ? (
                  <div className="proj-card__latest">
                    <span className="proj-card__latest-label">Latest</span>
                    <span className="proj-card__latest-value">
                      {p.latestTotalNetWorth != null ? formatCurrency(p.latestTotalNetWorth) : '—'}
                    </span>
                    <span className="proj-card__latest-date">{formatSnapshotDate(p.latestSnapshotDate)}</span>
                  </div>
                ) : (
                  <div className="proj-card__latest proj-card__latest--empty">No snapshots yet</div>
                )}
              </button>

              <div className="proj-card__actions">
                <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button"
                  onClick={() => navigate(`/projections/${p.id}`)}>
                  Open →
                </button>
                <button className="acc-btn acc-btn--danger acc-btn--sm" type="button"
                  onClick={() => handleDelete(p)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
