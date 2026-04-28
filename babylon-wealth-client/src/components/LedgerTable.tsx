import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import './LedgerTable.css';

export type RowVariant = 'asset' | 'liability' | 'neutral';

export interface TotalsRow {
  [accessorKey: string]: React.ReactNode;
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
}: LedgerTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Inject actions column if handlers provided
  const allColumns: ColumnDef<T, unknown>[] = [
    ...columns,
    ...(onEditRow || onDeleteRow
      ? [{
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
        } as ColumnDef<T, unknown>]
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

  if (isLoading) {
    return (
      <div className="lt__skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lt__skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <div className="lt__wrapper">
      <table className="lt__table">
        <thead className="lt__thead">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
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
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td className="lt__empty" colSpan={allColumns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => {
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

        {totals && table.getRowModel().rows.length > 0 && (
          <tfoot>
            <tr className="lt__totals-row">
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
}
