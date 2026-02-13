import { useMutation, useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import {
  AssistantJournalEntryRow,
  AssistantJournalSummaryRow,
  JournalCategoryRow
} from '../types';

export interface JournalEntryFilters {
  assistant_id?: string | null;
  category_id?: number | null;
  from?: string | null;
  to?: string | null;
}

interface UseJournalEntriesOptions {
  enabled?: boolean;
}

export interface InsertJournalEntryInput {
  assistant_id: string;
  assistant_name: string;
  entry_date: string;
  category_id: number;
  title: string;
  notes?: string | null;
}

export interface InsertJournalCategoryInput {
  name: string;
  group_name: string;
  emoji: string;
  colour: string;
  sort_order: number;
}

export interface UpdateJournalCategoryInput {
  name?: string;
  group_name?: string;
  emoji?: string;
  colour?: string;
  sort_order?: number;
  is_active?: boolean;
}

function mapJournalCategoryRow(row: Record<string, unknown>): JournalCategoryRow {
  return {
    id: toNumber(row.id),
    name: toStringValue(row.name),
    group_name: toStringValue(row.group_name),
    emoji: toStringValue(row.emoji),
    colour: toStringValue(row.colour, '#696968'),
    sort_order: toNumber(row.sort_order),
    is_active: Boolean(row.is_active)
  };
}

function mapJournalEntryRow(row: Record<string, unknown>): AssistantJournalEntryRow {
  const entryDate = row.entry_date;
  const lastEntry =
    entryDate instanceof Date
      ? entryDate.toISOString().slice(0, 10)
      : toStringValue(entryDate);

  return {
    id: toNumber(row.id),
    assistant_id: toStringValue(row.assistant_id),
    assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
    entry_date: lastEntry,
    category_id: toNumber(row.category_id),
    title: toStringValue(row.title),
    notes: row.notes == null ? null : toStringValue(row.notes),
    logged_by: row.logged_by == null ? null : toStringValue(row.logged_by),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
    category_name: toStringValue(row.category_name),
    category_emoji: toStringValue(row.category_emoji),
    category_colour: toStringValue(row.category_colour, '#696968'),
    category_group_name: toStringValue(row.category_group_name)
  };
}

function mapJournalSummaryRow(row: Record<string, unknown>): AssistantJournalSummaryRow {
  const lastEntryDate = row.last_entry_date;
  const normalizedLastEntryDate =
    lastEntryDate instanceof Date
      ? lastEntryDate.toISOString().slice(0, 10)
      : lastEntryDate == null
        ? null
        : toStringValue(lastEntryDate);

  return {
    assistant_id: toStringValue(row.assistant_id),
    assistant_name: toDisplayAssistantName(toStringValue(row.assistant_name)),
    assistant_type: toStringValue(row.assistant_type),
    entries_last_30d: toNumber(row.entries_last_30d),
    attendance_30d: toNumber(row.attendance_30d),
    performance_30d: toNumber(row.performance_30d),
    development_30d: toNumber(row.development_30d),
    operational_30d: toNumber(row.operational_30d),
    total_entries: toNumber(row.total_entries),
    last_entry_date: normalizedLastEntryDate
  };
}

export async function fetchJournalEntries(
  filters: JournalEntryFilters = {}
): Promise<AssistantJournalEntryRow[]> {
  const assistantId = filters.assistant_id ?? null;
  const categoryId = filters.category_id ?? null;
  const from = filters.from ?? null;
  const to = filters.to ?? null;

  const rows = (await sql`
    SELECT
      j.*,
      c.name AS category_name,
      c.emoji AS category_emoji,
      c.colour AS category_colour,
      c.group_name AS category_group_name
    FROM assistant_journal j
    JOIN journal_categories c ON c.id = j.category_id
    WHERE (${assistantId}::text IS NULL OR j.assistant_id::text = ${assistantId}::text)
      AND (${categoryId}::int IS NULL OR j.category_id = ${categoryId}::int)
      AND (${from}::date IS NULL OR j.entry_date::date >= ${from}::date)
      AND (${to}::date IS NULL OR j.entry_date::date <= ${to}::date)
    ORDER BY j.entry_date DESC, j.id DESC
  `) as Record<string, unknown>[];

  return rows.map(mapJournalEntryRow);
}

export async function fetchJournalSummary(): Promise<AssistantJournalSummaryRow[]> {
  const rows = (await sql`
    SELECT *
    FROM v_assistant_journal_summary
    WHERE assistant_type = 'FOH'
    ORDER BY assistant_name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapJournalSummaryRow);
}

export async function fetchCategories(): Promise<JournalCategoryRow[]> {
  const rows = (await sql`
    SELECT *
    FROM journal_categories
    WHERE is_active = true
    ORDER BY group_name ASC, sort_order ASC, name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapJournalCategoryRow);
}

export async function fetchAllCategories(): Promise<JournalCategoryRow[]> {
  const rows = (await sql`
    SELECT *
    FROM journal_categories
    ORDER BY group_name ASC, sort_order ASC, name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapJournalCategoryRow);
}

export async function insertEntry(data: InsertJournalEntryInput): Promise<void> {
  await sql`
    INSERT INTO assistant_journal (
      assistant_id,
      assistant_name,
      entry_date,
      category_id,
      title,
      notes
    ) VALUES (
      ${data.assistant_id},
      ${data.assistant_name},
      ${data.entry_date}::date,
      ${data.category_id},
      ${data.title},
      ${data.notes ?? null}
    )
  `;
}

export async function deleteEntry(id: number): Promise<void> {
  await sql`
    DELETE FROM assistant_journal
    WHERE id = ${id}
  `;
}

export async function insertCategory(data: InsertJournalCategoryInput): Promise<void> {
  await sql`
    INSERT INTO journal_categories (
      name,
      group_name,
      emoji,
      colour,
      sort_order
    ) VALUES (
      ${data.name},
      ${data.group_name},
      ${data.emoji},
      ${data.colour},
      ${data.sort_order}
    )
  `;
}

export async function updateCategory(
  id: number,
  data: UpdateJournalCategoryInput
): Promise<void> {
  await sql`
    UPDATE journal_categories
    SET
      name = COALESCE(${data.name ?? null}, name),
      group_name = COALESCE(${data.group_name ?? null}, group_name),
      emoji = COALESCE(${data.emoji ?? null}, emoji),
      colour = COALESCE(${data.colour ?? null}, colour),
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order),
      is_active = COALESCE(${data.is_active ?? null}, is_active)
    WHERE id = ${id}
  `;
}

export async function deactivateCategory(id: number): Promise<void> {
  await sql`
    UPDATE journal_categories
    SET is_active = false
    WHERE id = ${id}
  `;
}

export function useJournalEntries(
  filters: JournalEntryFilters,
  options?: UseJournalEntriesOptions
) {
  return useQuery<AssistantJournalEntryRow[]>({
    queryKey: ['assistant_journal_entries', filters],
    queryFn: () => fetchJournalEntries(filters),
    enabled: options?.enabled ?? true
  });
}

export function useJournalSummary() {
  return useQuery<AssistantJournalSummaryRow[]>({
    queryKey: ['assistant_journal_summary'],
    queryFn: fetchJournalSummary
  });
}

export function useJournalCategories() {
  return useQuery<JournalCategoryRow[]>({
    queryKey: ['assistant_journal_categories_active'],
    queryFn: fetchCategories
  });
}

export function useAllJournalCategories() {
  return useQuery<JournalCategoryRow[]>({
    queryKey: ['assistant_journal_categories_all'],
    queryFn: fetchAllCategories
  });
}

export function useInsertJournalEntry() {
  return useMutation({
    mutationFn: insertEntry
  });
}

export function useDeleteJournalEntry() {
  return useMutation({
    mutationFn: deleteEntry
  });
}

export function useInsertJournalCategory() {
  return useMutation({
    mutationFn: insertCategory
  });
}

export function useUpdateJournalCategory() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJournalCategoryInput }) =>
      updateCategory(id, data)
  });
}

export function useDeactivateJournalCategory() {
  return useMutation({
    mutationFn: deactivateCategory
  });
}
