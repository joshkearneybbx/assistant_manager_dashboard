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
        WHERE family_id::text NOT IN ('recRpXW7Q0aAMnbht', 'recWsSUu7Z7RfCLo9', 'recVjs2tfhrs6wPyQ', 'recxXHObMiPAJk5yn')
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
