import { useQuery } from '@tanstack/react-query';
import { toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { FamilyRow } from '../types';

export function useFamilies() {
  return useQuery<FamilyRow[]>({
    queryKey: ['families'],
    queryFn: async () => {
      const rows = (await sql`
        SELECT DISTINCT family_id, family_name
        FROM v_client_health
        ORDER BY family_name ASC
      `) as Record<string, unknown>[];
      return rows
        .map((row) => ({
          id: toStringValue(row.family_id ?? row.id),
          family_name: toStringValue(row.family_name),
          contract: null
        }))
        .sort((a, b) => a.family_name.localeCompare(b.family_name));
    }
  });
}
