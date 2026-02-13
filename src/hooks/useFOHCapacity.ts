import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FohCapacityRow } from '../types';
import { FilterState, shouldLogFilters } from './useFilters';

export function useFOHCapacity(filters: FilterState) {
  return useQuery<FohCapacityRow[]>({
    queryKey: ['v_foh_capacity', filters.assistant],
    queryFn: async () => {
      const assistantId = filters.assistant[0] ?? null;

      if (shouldLogFilters) {
        // eslint-disable-next-line no-console
        console.info('[filters:applied][v_foh_capacity]', { assistantId });
      }

      const rawRows = (await sql`
        SELECT *
        FROM v_foh_capacity
        WHERE (${assistantId}::text IS NULL OR assistant_id::text = ${assistantId}::text)
        ORDER BY available_slots ASC
      `) as Record<string, unknown>[];

      return rawRows.map((row) => ({
        assistant_id: toStringValue(row.assistant_id),
        assistant_name: toStringValue(row.assistant_name),
        current_clients: toNumber(row.current_clients),
        base_capacity: toNumber(row.base_capacity),
        max_capacity: toNumber(row.max_capacity),
        available_slots: toNumber(row.available_slots),
        capacity_status: toStringValue(row.capacity_status),
        can_take_holiday_cover: Boolean(row.can_take_holiday_cover)
      }));
    }
  });
}
