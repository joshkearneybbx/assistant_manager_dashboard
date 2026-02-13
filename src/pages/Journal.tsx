import { useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonStatCards, SkeletonTable } from '../components/ui/Skeleton';
import { useAssistants } from '../hooks/useAssistants';
import {
  JournalEntryFilters,
  useAllJournalCategories,
  useDeactivateJournalCategory,
  useDeleteJournalEntry,
  useInsertJournalCategory,
  useInsertJournalEntry,
  useJournalCategories,
  useJournalEntries,
  useJournalSummary,
  useUpdateJournalCategory
} from '../hooks/useAssistantJournal';
import { JournalCategoryRow } from '../types';

type JournalTab = 'entries' | 'categories';

interface CategoryDraft {
  name: string;
  group_name: string;
  emoji: string;
  colour: string;
  sort_order: number;
  is_active: boolean;
}

interface AddCategoryFormState {
  name: string;
  group_name: string;
  custom_group_name: string;
  emoji: string;
  colour: string;
  sort_order: number;
}

const selectBase =
  'h-10 appearance-none rounded-md border border-sand-300 bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23696968%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm text-base-black focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

const inputBase =
  'h-10 rounded-md border border-sand-300 bg-white px-3 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20';

const groups = ['Attendance', 'Performance', 'Development', 'Operational'];

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to)
  };
}

function truncate(value: string | null, max = 60): string {
  if (!value) return '-';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function normalizeHex(hex: string): string {
  const candidate = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate;
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    return `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`;
  }
  return '#696968';
}

function hexToRgba(hex: string, alpha = 0.1): string {
  const normalized = normalizeHex(hex);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function groupCategories(rows: JournalCategoryRow[]): Array<[string, JournalCategoryRow[]]> {
  const byGroup = new Map<string, JournalCategoryRow[]>();
  for (const row of rows) {
    const key = row.group_name || 'Other';
    const next = byGroup.get(key) ?? [];
    next.push(row);
    byGroup.set(key, next);
  }
  return Array.from(byGroup.entries());
}

export function Journal() {
  const queryClient = useQueryClient();
  const assistants = useAssistants();
  const summary = useJournalSummary();
  const activeCategories = useJournalCategories();
  const allCategories = useAllJournalCategories();

  const [activeTab, setActiveTab] = useState<JournalTab>('entries');
  const [assistantFilter, setAssistantFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);

  const [entryForm, setEntryForm] = useState(() => ({
    assistant_id: '',
    entry_date: toDateInputValue(new Date()),
    category_id: '',
    title: '',
    notes: ''
  }));

  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, CategoryDraft>>({});
  const [addCategoryForm, setAddCategoryForm] = useState<AddCategoryFormState>({
    name: '',
    group_name: groups[0],
    custom_group_name: '',
    emoji: '📝',
    colour: '#274346',
    sort_order: 100
  });

  const range = useMemo(defaultDateRange, []);
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);

  const journalFilters = useMemo<JournalEntryFilters>(
    () => ({
      assistant_id: assistantFilter || null,
      category_id: categoryFilter ? Number(categoryFilter) : null,
      from: fromDate || null,
      to: toDate || null
    }),
    [assistantFilter, categoryFilter, fromDate, toDate]
  );

  const entries = useJournalEntries(journalFilters);

  const insertEntryMutation = useInsertJournalEntry();
  const deleteEntryMutation = useDeleteJournalEntry();
  const insertCategoryMutation = useInsertJournalCategory();
  const updateCategoryMutation = useUpdateJournalCategory();
  const deactivateCategoryMutation = useDeactivateJournalCategory();

  useEffect(() => {
    const rows = allCategories.data ?? [];
    const next: Record<number, CategoryDraft> = {};
    for (const row of rows) {
      next[row.id] = {
        name: row.name,
        group_name: row.group_name,
        emoji: row.emoji,
        colour: normalizeHex(row.colour),
        sort_order: row.sort_order,
        is_active: row.is_active
      };
    }
    setCategoryDrafts(next);
  }, [allCategories.data]);

  const assistantOptions = assistants.data ?? [];
  const activeCategoryOptions = activeCategories.data ?? [];
  const allCategoryRows = allCategories.data ?? [];

  const groupedActiveCategories = useMemo(
    () => groupCategories(activeCategoryOptions),
    [activeCategoryOptions]
  );

  const groupedAllCategories = useMemo(
    () => groupCategories(allCategoryRows),
    [allCategoryRows]
  );

  const summaryRows = (summary.data ?? []).filter((row) => row.assistant_type === 'FOH');

  const refreshJournalData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assistant_journal_entries'] }),
      queryClient.invalidateQueries({ queryKey: ['assistant_journal_summary'] }),
      queryClient.invalidateQueries({ queryKey: ['assistant_journal_categories_active'] }),
      queryClient.invalidateQueries({ queryKey: ['assistant_journal_categories_all'] })
    ]);
  };

  const onAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJournalError(null);

    const selectedAssistant = assistantOptions.find(
      (assistant) => assistant.id === entryForm.assistant_id
    );

    if (!selectedAssistant || !entryForm.category_id || !entryForm.title.trim()) {
      setJournalError('Assistant, category, and title are required.');
      return;
    }

    try {
      await insertEntryMutation.mutateAsync({
        assistant_id: selectedAssistant.id,
        assistant_name: selectedAssistant.name,
        entry_date: entryForm.entry_date,
        category_id: Number(entryForm.category_id),
        title: entryForm.title.trim(),
        notes: entryForm.notes.trim() ? entryForm.notes.trim() : null
      });

      await refreshJournalData();
      setShowAddEntry(false);
      setEntryForm({
        assistant_id: '',
        entry_date: toDateInputValue(new Date()),
        category_id: '',
        title: '',
        notes: ''
      });
    } catch {
      setJournalError('Failed to save journal entry.');
    }
  };

  const onDeleteEntry = async (id: number) => {
    setJournalError(null);
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await deleteEntryMutation.mutateAsync(id);
      await refreshJournalData();
    } catch {
      setJournalError('Failed to delete journal entry.');
    }
  };

  const saveCategoryRow = async (id: number) => {
    const draft = categoryDrafts[id];
    if (!draft) return;
    setJournalError(null);

    if (!draft.name.trim() || !draft.group_name.trim()) {
      setJournalError('Category name and group are required.');
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        id,
        data: {
          name: draft.name.trim(),
          group_name: draft.group_name.trim(),
          emoji: draft.emoji.trim(),
          colour: normalizeHex(draft.colour),
          sort_order: Number(draft.sort_order),
          is_active: draft.is_active
        }
      });
      await refreshJournalData();
    } catch {
      setJournalError('Failed to update category.');
    }
  };

  const toggleCategoryActive = async (id: number, isActive: boolean) => {
    setJournalError(null);
    try {
      await updateCategoryMutation.mutateAsync({
        id,
        data: { is_active: isActive }
      });
      await refreshJournalData();
    } catch {
      setJournalError('Failed to update category status.');
    }
  };

  const onDeactivateCategory = async (id: number) => {
    setJournalError(null);
    if (!window.confirm('Deactivate this category?')) return;
    try {
      await deactivateCategoryMutation.mutateAsync(id);
      await refreshJournalData();
    } catch {
      setJournalError('Failed to deactivate category.');
    }
  };

  const onAddCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJournalError(null);

    const groupName =
      addCategoryForm.group_name === '__new__'
        ? addCategoryForm.custom_group_name.trim()
        : addCategoryForm.group_name.trim();

    if (!addCategoryForm.name.trim() || !groupName) {
      setJournalError('Category name and group are required.');
      return;
    }

    try {
      await insertCategoryMutation.mutateAsync({
        name: addCategoryForm.name.trim(),
        group_name: groupName,
        emoji: addCategoryForm.emoji.trim() || '📝',
        colour: normalizeHex(addCategoryForm.colour),
        sort_order: Number(addCategoryForm.sort_order)
      });
      await refreshJournalData();
      setAddCategoryForm({
        name: '',
        group_name: groups[0],
        custom_group_name: '',
        emoji: '📝',
        colour: '#274346',
        sort_order: 100
      });
    } catch {
      setJournalError('Failed to add category.');
    }
  };

  const categoryGroups = useMemo(() => {
    const set = new Set<string>(groups);
    for (const row of allCategoryRows) {
      if (row.group_name) set.add(row.group_name);
    }
    return Array.from(set);
  }, [allCategoryRows]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-l-assistant-dark border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Assistant Journal</h1>
        <p className="mt-1 text-sm text-grey-400">
          Track attendance, performance, development, and operational notes by assistant.
        </p>
      </section>

      <section className="rounded-lg border border-sand-300 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === 'entries'
                ? 'bg-sand-200 text-base-black'
                : 'text-grey-400 hover:bg-sand-100 hover:text-base-black'
            }`}
          >
            Journal Entries
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === 'categories'
                ? 'bg-sand-200 text-base-black'
                : 'text-grey-400 hover:bg-sand-100 hover:text-base-black'
            }`}
          >
            <Settings size={14} />
            Manage Categories
          </button>
        </div>
      </section>

      {journalError && (
        <ErrorState
          message={journalError}
          onRetry={() => {
            setJournalError(null);
            entries.refetch();
            summary.refetch();
            activeCategories.refetch();
            allCategories.refetch();
          }}
        />
      )}

      {activeTab === 'entries' && (
        <>
          <section>
            <h2 className="mb-2 text-lg font-bold text-base-black">Summary</h2>
            {summary.isLoading ? (
              <SkeletonStatCards count={3} />
            ) : summary.error ? (
              <ErrorState
                message="Failed to load journal summary."
                onRetry={() => summary.refetch()}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {summaryRows.map((row) => {
                  const buckets = [
                    { label: 'Attendance', value: row.attendance_30d },
                    { label: 'Performance', value: row.performance_30d },
                    { label: 'Development', value: row.development_30d },
                    { label: 'Operational', value: row.operational_30d }
                  ].filter((item) => item.value > 0);

                  return (
                    <article
                      key={row.assistant_id}
                      className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm"
                    >
                      <div className="text-base font-semibold text-base-black">{row.assistant_name}</div>
                      <div className="mt-1 text-sm text-grey-400">
                        {row.entries_last_30d} entries in last 30 days
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {buckets.length ? (
                          buckets.map((bucket) => (
                            <span
                              key={bucket.label}
                              className="inline-flex rounded-full border border-sand-300 bg-sand-100 px-2 py-0.5 text-xs font-medium text-base-black"
                            >
                              {bucket.label} ({bucket.value})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-grey-400">No grouped entries in last 30 days.</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-base-black">Add Entry</h2>
              <button
                type="button"
                onClick={() => setShowAddEntry((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-base-black hover:bg-sand-100"
              >
                <Plus size={14} />
                {showAddEntry ? 'Hide' : 'Add Entry'}
              </button>
            </div>

            {showAddEntry && (
              <form onSubmit={onAddEntry} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  required
                  className={selectBase}
                  value={entryForm.assistant_id}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, assistant_id: event.target.value }))
                  }
                >
                  <option value="">Select Assistant</option>
                  {assistantOptions.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </option>
                  ))}
                </select>

                <input
                  required
                  type="date"
                  className={inputBase}
                  value={entryForm.entry_date}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, entry_date: event.target.value }))
                  }
                />

                <select
                  required
                  className={selectBase}
                  value={entryForm.category_id}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, category_id: event.target.value }))
                  }
                >
                  <option value="">Select Category</option>
                  {groupedActiveCategories.map(([groupName, rows]) => (
                    <optgroup key={groupName} label={groupName}>
                      {rows.map((category) => (
                        <option key={category.id} value={String(category.id)}>
                          {category.emoji} {category.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <input
                  required
                  type="text"
                  placeholder="Title"
                  className={inputBase}
                  value={entryForm.title}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />

                <textarea
                  placeholder="Notes (optional)"
                  className="min-h-24 rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-base-black placeholder:text-grey-400 focus:border-assistant-dark focus:outline-none focus:ring-2 focus:ring-assistant-dark/20 md:col-span-2"
                  value={entryForm.notes}
                  onChange={(event) =>
                    setEntryForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />

                <div className="flex gap-2 md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-md bg-base-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                    disabled={insertEntryMutation.isPending}
                  >
                    {insertEntryMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-base-black hover:bg-sand-100"
                    onClick={() => setShowAddEntry(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-base-black">Journal Entries</h2>
            <div className="mb-3 rounded-lg border border-sand-300 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className={`${selectBase} min-w-52`}
                  value={assistantFilter}
                  onChange={(event) => setAssistantFilter(event.target.value)}
                  aria-label="Filter by assistant"
                >
                  <option value="">All Assistants</option>
                  {assistantOptions.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </option>
                  ))}
                </select>

                <select
                  className={`${selectBase} min-w-60`}
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
                  {groupedActiveCategories.map(([groupName, rows]) => (
                    <optgroup key={groupName} label={`— ${groupName} —`}>
                      {rows.map((category) => (
                        <option key={category.id} value={String(category.id)}>
                          {category.emoji} {category.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <input
                  type="date"
                  className={inputBase}
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  aria-label="From date"
                />
                <input
                  type="date"
                  className={inputBase}
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>

            {entries.isLoading ? (
              <SkeletonTable rows={8} cols={6} />
            ) : entries.error ? (
              <ErrorState
                message="Failed to load journal entries."
                onRetry={() => entries.refetch()}
              />
            ) : (
              <DataTable
                data={entries.data ?? []}
                rowKey={(row) => String(row.id)}
                caption="Assistant journal entries"
                emptyMessage="No journal entries match the selected filters."
                onRowClick={(row) =>
                  setExpandedEntryId((prev) => (prev === String(row.id) ? null : String(row.id)))
                }
                expandedRowKey={expandedEntryId}
                renderExpanded={(row) => (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-base-black">Full Notes</div>
                    <div className="whitespace-pre-wrap text-sm text-base-black">
                      {row.notes?.trim() ? row.notes : 'No notes provided.'}
                    </div>
                  </div>
                )}
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    sortable: true,
                    value: (row) => row.entry_date,
                    render: (row) => row.entry_date
                  },
                  {
                    key: 'assistant',
                    header: 'Assistant',
                    sortable: true,
                    value: (row) => row.assistant_name,
                    render: (row) => row.assistant_name
                  },
                  {
                    key: 'category',
                    header: 'Category',
                    sortable: true,
                    value: (row) => row.category_name,
                    render: (row) => (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: normalizeHex(row.category_colour),
                          backgroundColor: hexToRgba(row.category_colour, 0.1),
                          border: `1px solid ${hexToRgba(row.category_colour, 0.3)}`
                        }}
                      >
                        <span>{row.category_emoji}</span>
                        <span>{row.category_name}</span>
                      </span>
                    )
                  },
                  {
                    key: 'title',
                    header: 'Title',
                    sortable: true,
                    value: (row) => row.title,
                    render: (row) => row.title
                  },
                  {
                    key: 'notes',
                    header: 'Notes',
                    render: (row) => truncate(row.notes)
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onDeleteEntry(row.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-sand-300 px-2 py-1 text-xs text-status-red hover:bg-status-red-light"
                        aria-label={`Delete entry ${row.title}`}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )
                  }
                ]}
              />
            )}
          </section>
        </>
      )}

      {activeTab === 'categories' && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-base-black">Manage Categories</h2>

          <form
            onSubmit={onAddCategory}
            className="grid grid-cols-1 gap-3 rounded-lg border border-sand-300 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-3"
          >
            <input
              required
              type="text"
              placeholder="Category name"
              className={inputBase}
              value={addCategoryForm.name}
              onChange={(event) =>
                setAddCategoryForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <select
              className={selectBase}
              value={addCategoryForm.group_name}
              onChange={(event) =>
                setAddCategoryForm((prev) => ({ ...prev, group_name: event.target.value }))
              }
            >
              {categoryGroups.map((groupName) => (
                <option key={groupName} value={groupName}>
                  {groupName}
                </option>
              ))}
              <option value="__new__">New Group</option>
            </select>
            {addCategoryForm.group_name === '__new__' ? (
              <input
                required
                type="text"
                placeholder="New group name"
                className={inputBase}
                value={addCategoryForm.custom_group_name}
                onChange={(event) =>
                  setAddCategoryForm((prev) => ({
                    ...prev,
                    custom_group_name: event.target.value
                  }))
                }
              />
            ) : (
              <div />
            )}
            <input
              type="text"
              placeholder="Emoji"
              className={inputBase}
              value={addCategoryForm.emoji}
              onChange={(event) =>
                setAddCategoryForm((prev) => ({ ...prev, emoji: event.target.value }))
              }
            />
            <input
              type="color"
              className="h-10 w-full rounded-md border border-sand-300 bg-white px-2"
              value={normalizeHex(addCategoryForm.colour)}
              onChange={(event) =>
                setAddCategoryForm((prev) => ({ ...prev, colour: event.target.value }))
              }
            />
            <input
              type="number"
              className={inputBase}
              value={addCategoryForm.sort_order}
              onChange={(event) =>
                setAddCategoryForm((prev) => ({
                  ...prev,
                  sort_order: Number(event.target.value)
                }))
              }
            />
            <div className="md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-base-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                disabled={insertCategoryMutation.isPending}
              >
                {insertCategoryMutation.isPending ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </form>

          {allCategories.isLoading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : allCategories.error ? (
            <ErrorState
              message="Failed to load categories."
              onRetry={() => allCategories.refetch()}
            />
          ) : (
            groupedAllCategories.map(([groupName, rows]) => (
              <section key={groupName} className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-base-black">{groupName}</h3>
                <div className="space-y-2">
                  {rows.map((category) => {
                    const draft = categoryDrafts[category.id];
                    if (!draft) return null;
                    return (
                      <div
                        key={category.id}
                        className={`grid grid-cols-1 gap-2 rounded-md border border-sand-300 p-3 md:grid-cols-[70px_1fr_1fr_110px_80px_150px] ${
                          draft.is_active ? 'bg-white' : 'bg-sand-100 opacity-70'
                        }`}
                      >
                        <input
                          type="text"
                          className={inputBase}
                          value={draft.emoji}
                          onChange={(event) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...prev[category.id],
                                emoji: event.target.value
                              }
                            }))
                          }
                        />
                        <input
                          type="text"
                          className={inputBase}
                          value={draft.name}
                          onChange={(event) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...prev[category.id],
                                name: event.target.value
                              }
                            }))
                          }
                        />
                        <input
                          type="text"
                          className={inputBase}
                          value={draft.group_name}
                          onChange={(event) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...prev[category.id],
                                group_name: event.target.value
                              }
                            }))
                          }
                        />
                        <input
                          type="color"
                          className="h-10 w-full rounded-md border border-sand-300 bg-white px-2"
                          value={normalizeHex(draft.colour)}
                          onChange={(event) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...prev[category.id],
                                colour: event.target.value
                              }
                            }))
                          }
                        />
                        <input
                          type="number"
                          className={inputBase}
                          value={draft.sort_order}
                          onChange={(event) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...prev[category.id],
                                sort_order: Number(event.target.value)
                              }
                            }))
                          }
                        />
                        <div className="flex items-center justify-end gap-2">
                          <label className="inline-flex items-center gap-1 text-xs text-base-black">
                            <input
                              type="checkbox"
                              checked={draft.is_active}
                              onChange={(event) => {
                                const nextActive = event.target.checked;
                                setCategoryDrafts((prev) => ({
                                  ...prev,
                                  [category.id]: {
                                    ...prev[category.id],
                                    is_active: nextActive
                                  }
                                }));
                                void toggleCategoryActive(category.id, nextActive);
                              }}
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            className="rounded-md border border-sand-300 px-2 py-1 text-xs text-base-black hover:bg-sand-100"
                            onClick={() => void saveCategoryRow(category.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-sand-300 px-2 py-1 text-xs text-status-red hover:bg-status-red-light"
                            onClick={() => void onDeactivateCategory(category.id)}
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </section>
      )}
    </div>
  );
}
