import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './LedgerTable.css';

export type RowVariant = 'asset' | 'liability' | 'neutral';

export interface TotalsRow {
  [accessorKey: string]: React.ReactNode;
}

export interface SortableConfig<T> {
  ids: string[];
  getDragId: (row: T) => string;
  onReorder: (newOrderedIds: string[]) => void;
}

interface LedgerTableProps<T extends object> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowVariant?: (row: T) => RowVariant;
  getRowClass?: (row: T) => string;
  totals?: TotalsRow;
  isLoading?: boolean;
  emptyMessage?: string;
  onEditRow?: (row: T) => void;
  onDeleteRow?: (row: T) => void;
  sortable?: SortableConfig<T>;
}

function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${className}${isDragging ? ' lt__row--dragging' : ''}`}
    >
      <td className="lt__drag-handle" {...attributes} {...listeners}>
        <span className="lt__drag-icon">⠿</span>
      </td>
      {children}
    </tr>
  );
}

export function LedgerTable<T extends object>({
  data,
  columns,
  getRowVariant,
  getRowClass,
  totals,
  isLoading,
  emptyMessage = 'No records yet.',
  onEditRow,
  onDeleteRow,
  sortable,
}: LedgerTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allColumns: ColumnDef<T, unknown>[] = [
    ...columns,
    ...(onEditRow || onDeleteRow
      ? [
          {
            id: '_actions',
            header: '',
            cell: ({ row }: { row: { original: T } }) => (
              <div className="lt__actions">
                {onEditRow && (
                  <button
                    className="lt__action-btn lt__action-btn--edit"
                    onClick={() => onEditRow(row.original)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
                {onDeleteRow && (
                  <button
                    className="lt__action-btn lt__action-btn--delete"
                    onClick={() => onDeleteRow(row.original)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </div>
            ),
            enableSorting: false,
            size: 100,
          } as ColumnDef<T, unknown>,
        ]
      : []),
  ];

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !sortable) return;
    const oldIndex = sortable.ids.indexOf(active.id as string);
    const newIndex = sortable.ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    sortable.onReorder(arrayMove(sortable.ids, oldIndex, newIndex));
  }

  if (isLoading) {
    return (
      <div className="lt__skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lt__skeleton-row" />
        ))}
      </div>
    );
  }

  const rows = table.getRowModel().rows;
  const colCount = allColumns.length + (sortable ? 1 : 0);

  const tableEl = (
    <div className="lt__wrapper">
      <table className="lt__table">
        <thead className="lt__thead">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {sortable && <th className="lt__th lt__th--handle" />}
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`lt__th ${canSort ? 'lt__th--sortable' : ''}`}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && (
                      <span className="lt__sort-icon">
                        {sortDir === 'asc' ? ' ↑' : sortDir === 'desc' ? ' ↓' : ' ↕'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="lt__empty" colSpan={colCount}>
                {emptyMessage}
              </td>
            </tr>
          ) : sortable ? (
            <SortableContext items={sortable.ids} strategy={verticalListSortingStrategy}>
              {rows.map((row) => {
                const variant = getRowVariant ? getRowVariant(row.original) : 'neutral';
                const extra = getRowClass ? getRowClass(row.original) : '';
                const dragId = sortable.getDragId(row.original);
                return (
                  <SortableRow
                    key={row.id}
                    id={dragId}
                    className={`lt__row lt__row--${variant}${extra ? ` ${extra}` : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="lt__td">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </SortableRow>
                );
              })}
            </SortableContext>
          ) : (
            rows.map((row) => {
              const variant = getRowVariant ? getRowVariant(row.original) : 'neutral';
              const extra = getRowClass ? getRowClass(row.original) : '';
              return (
                <tr
                  key={row.id}
                  className={`lt__row lt__row--${variant}${extra ? ` ${extra}` : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="lt__td">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>

        {totals && rows.length > 0 && (
          <tfoot>
            <tr className="lt__totals-row">
              {sortable && <td className="lt__totals-cell" />}
              {table.getAllFlatColumns().map((col) => (
                <td key={col.id} className="lt__totals-cell">
                  {totals[col.id] ?? null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  if (sortable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {tableEl}
      </DndContext>
    );
  }

  return tableEl;
}
