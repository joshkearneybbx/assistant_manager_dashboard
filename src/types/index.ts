export type HealthStatus = 'Red' | 'Amber' | 'Green';
export type PerformanceStatus = 'Red' | 'Amber' | 'Green';
export type StuckStatus = 'Stuck' | 'Aging' | 'Delayed';

export interface DashboardAlertsRow {
  alert_type: string;
  red_count: number;
  amber_count: number;
}

export interface ClientHealthRow {
  family_id: string;
  family_name: string;
  assistant_id: string;
  assistant_name: string;
  contract: string | null;
  subscription_type?: string | null;
  active_tasks: number;
  days_since_last_task: number;
  health_status: HealthStatus;
}

export interface FohPerformanceRow {
  assistant_id: string;
  assistant_name: string;
  tasks_completed: number;
  active_tasks: number;
  avg_mins_per_task: number;
  client_count: number;
  red_clients: number;
  amber_clients: number;
  performance_status: PerformanceStatus;
}

export interface FohCapacityRow {
  assistant_id: string;
  assistant_name: string;
  current_clients: number;
  base_capacity: number;
  max_capacity: number;
  available_slots: number;
  capacity_status: string;
  can_take_holiday_cover: boolean;
}

export interface StuckTaskRow {
  task_id: string;
  task_title: string;
  family_id: string;
  family_name: string;
  assistant_id: string;
  assistant_name: string;
  days_since_update: number;
  task_state: string;
  task_status: string;
  category: string | null;
  stuck_status: StuckStatus;
}

export interface TaskDetailRow {
  task_id: string;
  family_id: string;
  family_name: string;
  assistant_id: string;
  assistant_name: string;
  task_title: string;
  category: string | null;
  closed_date: string | null;
  created_at: string;
}

export interface TogglDetailRow {
  entry_id: string;
  family_id: string;
  family_name: string;
  assistant_id: string;
  assistant_name: string;
  category: string | null;
  minutes: number;
  entry_date: string;
}

export interface ClientTimeBreakdownRow {
  family_id: string;
  category: string;
  minutes: number;
}

export interface ClientTimeTotalRow {
  family_id: string;
  family_name: string;
  total_minutes: number;
}

export interface AssistantRow {
  id: string;
  name: string;
  type: string;
}

export interface FamilyRow {
  id: string;
  family_name: string;
  is_active?: boolean;
  contract?: string | null;
}
