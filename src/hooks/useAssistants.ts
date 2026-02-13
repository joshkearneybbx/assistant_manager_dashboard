import { useQuery } from '@tanstack/react-query';
import { toDisplayAssistantName } from '../lib/displayName';
import { toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { AssistantRow } from '../types';

export function useAssistants() {
  return useQuery<AssistantRow[]>({
    queryKey: ['assistants'],
    queryFn: async () => {
      const rows = (await sql`SELECT * FROM assistants WHERE type = 'FOH' ORDER BY name ASC`) as Record<string, unknown>[];
      return rows.map((row) => ({
        id: toStringValue(row.id),
        name: toDisplayAssistantName(toStringValue(row.name)),
        type: toStringValue(row.type)
      }));
    }
  });
}
