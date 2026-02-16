import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { Fragment, ReactNode, useMemo, useState, KeyboardEvent } from 'react';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  value?: (row: T) => string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  expandedRowKey?: string | null;
  renderExpanded?: (row: T) => ReactNode;
  caption?: string;
  emptyMessage?: string;
}

function ExpandPanel({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  if (!expanded) return null;
  return <div>{children}</div>;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  expandedRowKey,
  renderExpanded,
  caption,
  emptyMessage = 'No data to display.'
}: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const isClickable = Boolean(onRowClick);
  const isExpandable = Boolean(renderExpanded);
  const totalCols = columns.length + (isExpandable ? 1 : 0);

  const sorted = useMemo(() => {
    if (!sortBy) return data;
    const col = columns.find((c) => c.key === sortBy && c.sortable);
    if (!col?.value) return data;

    const copy = [...data].sort((a, b) => {
      const aVal = col.value?.(a) ?? '';
      const bVal = col.value?.(b) ?? '';
      if (aVal === bVal) return 0;
      return aVal > bVal ? 1 : -1;
    });

    return dir === 'asc' ? copy : copy.reverse();
  }, [columns, data, dir, sortBy]);

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setDir('asc');
  };

  const handleRowKeyDown = (e: KeyboardEvent, row: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  const getSortIcon = (colKey: string) => {
    if (sortBy === colKey) {
      return dir === 'asc' ? <ChevronUp size={14} className="text-base-black" /> : <ChevronDown size={14} className="text-base-black" />;
    }
    return <ChevronsUpDown size={14} className="opacity-40" />;
  };

  const getAriaSortValue = (colKey: string): 'ascending' | 'descending' | 'none' | undefined => {
    if (!sortBy || sortBy !== colKey) return 'none';
    return dir === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-lg border border-sand-300 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-sand-100 text-left text-grey-400">
          <tr>
            {isExpandable && <th className="w-8 px-2 py-3" />}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 font-medium"
                aria-sort={col.sortable ? getAriaSortValue(col.key) : undefined}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left hover:text-base-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assistant-dark/30 focus-visible:ring-offset-1 rounded"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.header}
                    {getSortIcon(col.key)}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-grey-400">
                  <Inbox size={32} strokeWidth={1.5} />
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const key = rowKey(row);
              const isExpanded = expandedRowKey === key;
              return (
                <Fragment key={key}>
                  <tr
                    className={`border-t border-sand-300 transition-colors duration-150 odd:bg-white even:bg-sand-100/35 hover:bg-sand-100 ${
                      isClickable ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'bg-sand-100' : ''}`}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => handleRowKeyDown(e, row)}
                    tabIndex={isClickable ? 0 : undefined}
                    role={isClickable ? 'button' : undefined}
                  >
                    {isExpandable && (
                      <td className="w-8 px-2 py-3 text-grey-400">
                        <ChevronRight
                          size={16}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={`${key}-${col.key}`} className="px-4 py-3 tabular-nums text-base-black">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                  {renderExpanded && (
                    <tr className={isExpanded ? 'border-t border-sand-300' : ''}>
                      <td colSpan={totalCols} className="p-0">
                        <ExpandPanel expanded={isExpanded}>
                          <div className="bg-sand-100 px-4 py-4">
                            {renderExpanded(row)}
                          </div>
                        </ExpandPanel>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
