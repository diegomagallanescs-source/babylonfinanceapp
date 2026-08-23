import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useProjection } from '../../hooks/useProjection';
import {
  saveProjectionWorkspace,
  createProjectionSnapshot,
  deleteProjectionSnapshot,
  updateProjection,
} from '../../api/projections';
import { PageInfoTooltip } from '../../components/PageInfoTooltip';
import { ProjectionAccounting } from './ProjectionAccounting';
import { ProjectionChart } from './ProjectionChart';
import { formatSnapshotDate } from '../../utils/projectionState';

import type {
  ProjectionState,
  ProjectionSnapshotDto,
  ProjectionSnapshotKind,
} from '../../types/projections';
import { EMPTY_PROJECTION_STATE } from '../../types/projections';

import './ProjectionDetailPage.css';

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function ProjectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useProjection(id);

  // ── Workspace ─────────────────────────────────────────────
  // Local copy of the projection's ledger. Edits stay here until saved, and never reach
  // the real accounting tables — the only writes are to /projections/{id}/*.
  const [workspace, setWorkspace] = useState<ProjectionState>(EMPTY_PROJECTION_STATE);
  const [dirty, setDirty] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Seed once per projection so a background refetch can't wipe in-progress edits.
    if (data && loadedIdRef.current !== data.id) {
      loadedIdRef.current = data.id;
      setWorkspace(data.workspace ?? EMPTY_PROJECTION_STATE);
      setDirty(false);
    }
  }, [data]);

  // ── Snapshot controls ─────────────────────────────────────
  const [snapshotDate, setSnapshotDate] = useState(todayIso());
  const [kind, setKind] = useState<ProjectionSnapshotKind>('Projected');
  const [notes, setNotes] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Set when a chart point's accounting has been loaded into the workspace. */
  const [viewingSnapshot, setViewingSnapshot] = useState<ProjectionSnapshotDto | null>(null);

  // ── Rename ────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  function handleWorkspaceChange(next: ProjectionState) {
    setWorkspace(next);
    setDirty(true);
  }

  async function persistWorkspace(state: ProjectionState) {
    if (!id) return;
    await saveProjectionWorkspace(id, state);
    qc.invalidateQueries({ queryKey: ['projections', id] });
    qc.invalidateQueries({ queryKey: ['projections'] });
  }

  async function handleSaveWorkspace() {
    if (!id) return;
    setSavingWorkspace(true);
    setError(null);
    try {
      await persistWorkspace(workspace);
      setDirty(false);
    } catch {
      setError('Could not save the accounting changes. Please try again.');
    } finally {
      setSavingWorkspace(false);
    }
  }

  function handleDiscardWorkspace() {
    if (!data) return;
    if (!confirm('Discard unsaved changes to this accounting?')) return;
    setWorkspace(data.workspace ?? EMPTY_PROJECTION_STATE);
    setDirty(false);
  }

  async function handleSaveSnapshot() {
    if (!id) return;
    if (!snapshotDate) {
      setError('Pick a date for this snapshot.');
      return;
    }

    setSavingSnapshot(true);
    setError(null);
    try {
      await createProjectionSnapshot(id, {
        snapshotDate,
        kind,
        notes: notes.trim() || null,
        state: workspace,
      });
      // Keep the workspace in step with the point just plotted.
      await persistWorkspace(workspace);
      setDirty(false);
      setNotes('');
    } catch {
      setError('Could not save the snapshot. Please try again.');
    } finally {
      setSavingSnapshot(false);
    }
  }

  /** Loads a chart point's saved ledger into the accounting below and keeps it as the workspace. */
  async function handleViewAccounting(snapshot: ProjectionSnapshotDto) {
    setWorkspace(snapshot.state);
    setViewingSnapshot(snapshot);
    setSnapshotDate(snapshot.snapshotDate.slice(0, 10));
    setKind(snapshot.kind);
    setError(null);
    try {
      await persistWorkspace(snapshot.state);
      setDirty(false);
    } catch {
      // The ledger is already on screen; flag that it hasn't been stored as the workspace yet.
      setDirty(true);
      setError('Loaded this snapshot, but could not save it as the current accounting.');
    }
  }

  async function handleDeleteSnapshot(snapshot: ProjectionSnapshotDto) {
    if (!id) return;
    const label = `${snapshot.kind === 'Projected' ? 'Projection' : 'Realized'} snapshot from ${formatSnapshotDate(snapshot.snapshotDate)}`;
    if (!confirm(`Delete the ${label}?`)) return;

    setError(null);
    try {
      await deleteProjectionSnapshot(id, snapshot.id);
      if (viewingSnapshot?.id === snapshot.id) setViewingSnapshot(null);
      qc.invalidateQueries({ queryKey: ['projections', id] });
      qc.invalidateQueries({ queryKey: ['projections'] });
    } catch {
      setError('Could not delete that snapshot. Please try again.');
    }
  }

  function startRename() {
    if (!data) return;
    setNameDraft(data.name);
    setDescDraft(data.description ?? '');
    setEditingName(true);
  }

  async function handleRename() {
    if (!id || !nameDraft.trim()) return;
    setSavingName(true);
    setError(null);
    try {
      await updateProjection(id, { name: nameDraft.trim(), description: descDraft.trim() || null });
      qc.invalidateQueries({ queryKey: ['projections', id] });
      qc.invalidateQueries({ queryKey: ['projections'] });
      setEditingName(false);
    } catch {
      setError('Could not rename the projection. Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  if (isLoading) return <div className="proj-detail proj-detail--loading">Loading projection…</div>;

  if (isError || !data) {
    return (
      <div className="proj-detail">
        <div className="proj-detail__missing">
          <p>That projection could not be loaded.</p>
          <button className="acc-btn acc-btn--primary" type="button" onClick={() => navigate('/projections')}>
            Back to projections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="proj-detail">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="proj-detail__header">
        <Link className="proj-detail__back" to="/projections">← All projections</Link>

        {editingName ? (
          <div className="proj-detail__rename">
            <input
              className="acc-add-input"
              value={nameDraft}
              maxLength={120}
              placeholder="Projection name"
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <input
              className="acc-add-input"
              value={descDraft}
              maxLength={300}
              placeholder="Short description"
              onChange={(e) => setDescDraft(e.target.value)}
            />
            <button className="acc-btn acc-btn--primary acc-btn--sm" type="button"
              onClick={handleRename} disabled={savingName || !nameDraft.trim()}>
              {savingName ? 'Saving…' : 'Save'}
            </button>
            <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button"
              onClick={() => setEditingName(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="proj-detail__title-row">
            <div>
              <h1 className="proj-detail__title">
                {data.name}
                <PageInfoTooltip content={
                  <>
                    <p>A private copy of your accounting. Change any balance here to model a future — nothing you do in a projection touches the real Accounting tab.</p>
                    <p>Pick a date, choose Projection or Realized, and save a snapshot to plot it. Hover any point to load that accounting back in.</p>
                  </>
                } />
              </h1>
              {data.description && <p className="proj-detail__desc">{data.description}</p>}
            </div>
            <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button" onClick={startRename}>
              Rename
            </button>
          </div>
        )}
      </div>

      {/* ── Chart ──────────────────────────────────────── */}
      <div className="proj-detail__chart-card">
        <ProjectionChart
          snapshots={data.snapshots}
          activeSnapshotId={viewingSnapshot?.id ?? null}
          onViewAccounting={handleViewAccounting}
          onDeleteSnapshot={handleDeleteSnapshot}
        />
      </div>

      {/* ── Snapshot controls ──────────────────────────── */}
      <div className="proj-controls">
        <label className="proj-controls__field">
          <span className="proj-controls__label">Snapshot date</span>
          <input
            className="acc-add-input"
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
          />
        </label>

        <div className="proj-controls__field">
          <span className="proj-controls__label">Save as</span>
          <div className="proj-toggle" role="group" aria-label="Snapshot type">
            <button
              type="button"
              className={`proj-toggle__btn${kind === 'Projected' ? ' proj-toggle__btn--active proj-toggle__btn--projected' : ''}`}
              aria-pressed={kind === 'Projected'}
              onClick={() => setKind('Projected')}
            >
              Projection
            </button>
            <button
              type="button"
              className={`proj-toggle__btn${kind === 'Realized' ? ' proj-toggle__btn--active proj-toggle__btn--realized' : ''}`}
              aria-pressed={kind === 'Realized'}
              onClick={() => setKind('Realized')}
            >
              Realized
            </button>
          </div>
        </div>

        <div className="proj-controls__field proj-controls__field--action">
          <span className="proj-controls__label">&nbsp;</span>
          <button
            className="acc-btn acc-btn--primary"
            type="button"
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot}
          >
            {savingSnapshot ? 'Saving…' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────── */}
      <label className="proj-notes">
        <span className="proj-notes__label">Notes <span className="proj-notes__optional">(optional)</span></span>
        <input
          className="proj-notes__input"
          type="text"
          maxLength={1000}
          value={notes}
          placeholder="Anything worth remembering about this snapshot…"
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && <div className="proj-detail__error">{error}</div>}

      {viewingSnapshot && (
        <div className="proj-detail__viewing">
          <span>
            Showing the accounting saved on <strong>{formatSnapshotDate(viewingSnapshot.snapshotDate)}</strong>
            {' '}({viewingSnapshot.kind === 'Projected' ? 'Projection' : 'Realized'}). Edit it and save a new snapshot to plot another point.
          </span>
          <button className="acc-btn acc-btn--ghost acc-btn--sm" type="button"
            onClick={() => setViewingSnapshot(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Accounting copy ────────────────────────────── */}
      <ProjectionAccounting
        state={workspace}
        onChange={handleWorkspaceChange}
        disabled={savingSnapshot}
      />

      {dirty && (
        <div className="proj-detail__save-bar">
          <span className="acc-batch-info">⚠ Unsaved changes to this projection's accounting</span>
          <div className="acc-batch-actions">
            <button className="acc-btn acc-btn--ghost" type="button"
              onClick={handleDiscardWorkspace} disabled={savingWorkspace}>
              Discard
            </button>
            <button className="acc-btn acc-btn--primary" type="button"
              onClick={handleSaveWorkspace} disabled={savingWorkspace}>
              {savingWorkspace ? 'Saving…' : 'Save Accounting →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
