export type HealthStatus = 'Red' | 'Amber' | 'Green' | 'Purple';
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
  life_transitions?: string | null;
  life_transition_icons?: string | null;
  active_tasks: number;
  days_since_last_task: number;
  health_status: HealthStatus;
  flex_tasks_used?: number;
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

export interface RecentClientTaskRow {
  title: string;
  category: string | null;
  task_state: string;
  created_at: string;
  closed_at: string | null;
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

export interface FlexUsageRow {
  family_id: string;
  flex_tasks_used: number;
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

export interface JournalCategoryRow {
  id: number;
  name: string;
  group_name: string;
  emoji: string;
  colour: string;
  sort_order: number;
  is_active: boolean;
}

export interface AssistantJournalEntryRow {
  id: number;
  assistant_id: string;
  assistant_name: string;
  entry_date: string;
  category_id: number;
  title: string;
  notes: string | null;
  logged_by: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_emoji: string;
  category_colour: string;
  category_group_name: string;
}

export interface AssistantJournalSummaryRow {
  assistant_id: string;
  assistant_name: string;
  assistant_type: string;
  entries_last_30d: number;
  attendance_30d: number;
  performance_30d: number;
  development_30d: number;
  operational_30d: number;
  total_entries: number;
  last_entry_date: string | null;
}
