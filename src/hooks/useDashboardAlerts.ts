import { useQuery } from '@tanstack/react-query';
import { toNumber, toStringValue } from '../lib/normalize';
import { sql } from '../lib/neon';
import { DashboardAlertsRow } from '../types';

export function useDashboardAlerts() {
  return useQuery<DashboardAlertsRow[]>({
    queryKey: ['v_dashboard_alerts'],
    queryFn: async () => {
      const rows = (await sql`SELECT * FROM v_dashboard_alerts`) as Record<string, unknown>[];
      return rows.map((row) => ({
        alert_type: toStringValue(row.alert_type ?? row.category),
        red_count: toNumber(row.red_count),
        amber_count: toNumber(row.amber_count)
      }));
    }
  });
}
