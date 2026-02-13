import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TimePeriod =
  | 'last_7_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom';

export interface FilterState {
  period: TimePeriod;
  from?: string;
  to?: string;
  assistant: string[];
  client: string[];
  contract: string[];
  status: string[];
}

export interface UseFiltersResult {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setMany: (patch: Partial<FilterState>) => void;
  clearFilters: () => void;
  toDateRange: () => { from: string; to: string };
}

export const shouldLogFilters = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_FILTERS === 'true'
);

const DEFAULT_FILTERS: FilterState = {
  period: 'last_7_days',
  assistant: [],
  client: [],
  contract: [],
  status: []
};

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

function parseFilters(search: URLSearchParams): FilterState {
  const period = (search.get('period') as TimePeriod | null) ?? DEFAULT_FILTERS.period;

  return {
    period,
    from: search.get('from') ?? undefined,
    to: search.get('to') ?? undefined,
    assistant: parseList(search.get('assistant')),
    client: parseList(search.get('client')),
    contract: parseList(search.get('contract')),
    status: parseList(search.get('status'))
  };
}

function serializeFilters(filters: FilterState): URLSearchParams {
  const search = new URLSearchParams();
  search.set('period', filters.period);
  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);
  if (filters.assistant.length) search.set('assistant', filters.assistant.join(','));
  if (filters.client.length) search.set('client', filters.client.join(','));
  if (filters.contract.length) search.set('contract', filters.contract.join(','));
  if (filters.status.length) search.set('status', filters.status.join(','));
  return search;
}

function startOfDay(input: Date): Date {
  const copy = new Date(input);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeDateRange(filters: FilterState): { from: string; to: string } {
  const now = new Date();
  const today = startOfDay(now);

  if (filters.period === 'custom' && filters.from && filters.to) {
    return { from: filters.from, to: filters.to };
  }

  const to = today;
  const from = new Date(to);

  switch (filters.period) {
    case 'this_week': {
      const day = to.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      from.setDate(to.getDate() + mondayOffset);
      break;
    }
    case 'last_week': {
      const day = to.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      from.setDate(to.getDate() + mondayOffset - 7);
      to.setDate(to.getDate() + mondayOffset - 1);
      break;
    }
    case 'this_month': {
      from.setDate(1);
      break;
    }
    case 'last_month': {
      from.setMonth(to.getMonth() - 1, 1);
      to.setDate(0);
      break;
    }
    case 'last_30_days': {
      from.setDate(to.getDate() - 29);
      break;
    }
    case 'last_90_days': {
      from.setDate(to.getDate() - 89);
      break;
    }
    case 'last_7_days':
    default: {
      from.setDate(to.getDate() - 6);
      break;
    }
  }

  return { from: fmt(from), to: fmt(to) };
}

export function useFilters(): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setMany = (patch: Partial<FilterState>) => {
    const merged = { ...filters, ...patch };
    setSearchParams(serializeFilters(merged), { replace: true });
  };

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setMany({ [key]: value } as Partial<FilterState>);
  };

  const clearFilters = () => {
    setSearchParams(serializeFilters(DEFAULT_FILTERS), { replace: true });
  };

  const toDateRange = () => computeDateRange(filters);

  return { filters, setFilter, setMany, clearFilters, toDateRange };
}
