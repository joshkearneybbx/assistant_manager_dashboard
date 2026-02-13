# Assistant Manager Dashboard - Build Specification

## Overview

Build a new React dashboard for the BlckBx Assistant Manager (Lily) to monitor FOH assistant performance, client health, and capacity. This is a focused operational tool — alerts-first design that surfaces problems needing attention.

**Target User:** Lily Martin (Assistant Manager, FOH team)

---

## Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Data Fetching:** TanStack Query (React Query)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Database:** Neon (PostgreSQL with PostgREST API)

---

## Brand Design System

Use the exact BlckBx design system. This is critical for consistency.

### Colors (Tailwind config)

```javascript
colors: {
  // Core
  'base-black': '#1D1C1B',
  'white': '#FFFFFF',
  'cta': '#E7C51C',  // Gold/yellow - USE SPARINGLY (buttons, key actions only)
  
  // Sand (backgrounds, borders)
  'sand': {
    100: '#FAF9F8',  // Page background
    200: '#F5F3F0',
    300: '#E8E5E0',  // Borders
    400: '#DDD8D0',
  },
  
  // Grey
  'grey': {
    400: '#696968',  // Secondary text
  },
  
  // Mint (brand accent)
  'mint': {
    100: '#F8F8F8',
    200: '#C0BDBD',
    'pale-100': '#898787',
    'pale-200': '#898787',
  },
  
  // Assistant (teal tones)
  'assistant': {
    'light': '#D6FEFF',
    'dark': '#274346',
  },
  
  // Status States
  'status': {
    'green-light': '#5BBEA6',
    'green': '#1EA988',
    'orange-light': '#FFBB95',
    'orange': '#F4A85B',
    'orange-dark': '#E9722F',
    'orange-text': '#CD4A01',
    'red': '#E23737',  // Error
  },
}
```

### Status Color Usage

| Status | Background | Text/Icon | Border |
|--------|------------|-----------|--------|
| Green (Good) | `status-green-light` | `status-green` | `status-green` |
| Amber (Warning) | `status-orange-light` | `status-orange-text` | `status-orange` |
| Red (Alert) | Light red bg | `status-red` | `status-red` |

### Design Principles

- **Clean, minimal interface** — no unnecessary decoration
- **White cards** on `sand-100` background
- **Subtle borders** using `sand-300`
- **CTA color sparingly** — only for primary action buttons, not decorative
- **Tables** with hover states (`sand-100` on hover)
- **Consistent spacing** — `p-4` for compact cards, `p-6` for main cards
- **Typography** — Base black for headings, grey-400 for secondary text
- **Status pills/badges** — rounded, light background with darker text

---

## Database Connection

### Neon Configuration

```typescript
// Environment variables
VITE_NEON_DATA_API_URL=https://ep-super-bar-ab7k73ss.apirest.eu-west-2.aws.neon.tech/neondb/rest/v1

// API calls use PostgREST syntax
// Example: fetch(`${API_URL}/v_client_health?health_status=eq.Red`)
```

### Available Views

| View | Purpose |
|------|---------|
| `v_dashboard_alerts` | Homepage summary counts (red/amber per category) |
| `v_client_health` | Client activity status with health flags |
| `v_foh_performance` | Assistant metrics, avg time, client flags |
| `v_foh_capacity` | Client loads per assistant |
| `v_stuck_tasks` | Tasks open too long |
| `v_tasks_detail` | All tasks with dates for filtering |
| `v_toggl_detail` | Time entries with dates for filtering |
| `v_client_time_breakdown` | Time per client per category |
| `assistants` | Assistant list (filter by type='FOH') |
| `families` | Client list |

---

## Global Filters

All pages should support these filters (stored in URL params for shareability):

| Filter | Type | Options |
|--------|------|---------|
| Time Period | Dropdown | This Week, Last Week, This Month, Last Month, Last 30 Days, Last 90 Days, Custom |
| Assistant | Multi-select dropdown | All FOH assistants |
| Client | Search/autocomplete | All active clients |
| Contract | Multi-select dropdown | All contract types |
| Status | Multi-select | Red, Amber, Green |

### Filter Implementation

- Filters should appear in a collapsible bar at the top of each page
- Default: "Last 7 Days", no other filters applied
- Filters persist when navigating between pages (URL params)
- "Clear Filters" button to reset

---

## Pages

### 1. Home (Alerts Dashboard)

**Route:** `/`

**Purpose:** Show what needs attention right now. Alerts-first design.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Filters Bar - collapsed by default]                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Client      │ │ Assistant   │ │ Stuck       │ │Capacity│ │
│  │ Health      │ │ Performance │ │ Tasks       │ │        │ │
│  │ 4 Red  6 Amb│ │ 2 Red  4 Amb│ │ 34 Red 13Amb│ │ 0 Red  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Clients Needing Attention                    [View All] ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Client Name    │ Assistant │ Status │ Days Inactive     ││
│  │ John Smith     │ Brooke W  │ 🔴 Red │ 14 days           ││
│  │ Jane Doe       │ Eve G     │ 🟠 Amb │ 8 days            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Assistants Flagged                           [View All] ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Assistant   │ Avg Mins/Task │ Red Clients │ Status      ││
│  │ Cordelia W  │ 87 mins       │ 0           │ 🔴 Red      ││
│  │ Lily M      │ 54 mins       │ 0           │ 🔴 Red      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Stuck Tasks (7+ days)                        [View All] ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Task Title        │ Client     │ Assistant │ Days Open  ││
│  │ Summer party plan │ John Smith │ Brooke W  │ 41 days    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `v_dashboard_alerts` — for summary cards
- `v_client_health` — filtered to Red/Amber for client list
- `v_foh_performance` — filtered to Red/Amber for assistant list
- `v_stuck_tasks` — filtered to stuck_status='Stuck' for task list

**Interactions:**
- Clicking a summary card navigates to the relevant page with status filter applied
- Clicking a row in any table navigates to detail view
- "View All" links go to full page with appropriate filter

---

### 2. Assistant Performance

**Route:** `/performance`

**Purpose:** FOH team metrics with drill-down per assistant.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Filters Bar]                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ FOH Performance                                         ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Assistant    │ Tasks    │ Active │ Avg Mins │ Clients │ Status ││
│  │              │ Complete │ Tasks  │ Per Task │ (R/A/G) │        ││
│  │ ────────────────────────────────────────────────────────────── ││
│  │ Brooke W     │ 33       │ 64     │ 24.6     │ 2/2/14  │ 🟠 Amb ││
│  │ [expandable row - click to see client breakdown]               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `v_foh_performance` — main table data
- `v_client_health` — for expanded row (clients per assistant)
- `v_toggl_detail` — for time breakdown when filtered by date

**Columns:**
| Column | Source |
|--------|--------|
| Assistant | `assistant_name` |
| Tasks Completed | `tasks_completed` (filtered by date range) |
| Active Tasks | `active_tasks` |
| Avg Mins/Task | `avg_mins_per_task` |
| Clients (R/A/G) | `red_clients` / `amber_clients` / `client_count - red - amber` |
| Status | `performance_status` |

**Interactions:**
- Click row to expand and show:
  - Client list for that assistant
  - Time breakdown by category
- Sort by any column
- Filter by status (Red/Amber/Green)

---

### 3. Capacity

**Route:** `/capacity`

**Purpose:** Overview of client loads across FOH team.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Filters Bar]                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Total        │ │ Available    │ │ At/Over      │        │
│  │ Clients      │ │ Slots        │ │ Capacity     │        │
│  │ 105          │ │ 45           │ │ 0            │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ FOH Capacity                                            ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Assistant    │ Clients │ Base │ Max │ Available │Status ││
│  │ ────────────────────────────────────────────────────────││
│  │ Brooke W     │ 19      │ 20   │ 20  │ 1         │ Avail ││
│  │ [capacity bar visualization]                            ││
│  │ Caitlin T    │ 16      │ 20   │ 20  │ 4         │ Avail ││
│  │ [capacity bar visualization]                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `v_foh_capacity` — all data

**Capacity Bar:**
- Visual bar showing current clients vs max capacity
- Green when below base_capacity
- Orange when between base and max
- Red when at or over max

**Columns:**
| Column | Source |
|--------|--------|
| Assistant | `assistant_name` |
| Clients | `current_clients` |
| Base Capacity | `base_capacity` |
| Max Capacity | `max_capacity` |
| Available | `available_slots` |
| Status | `capacity_status` |
| Holiday Cover | `can_take_holiday_cover` (show icon if true) |

---

### 4. Client Health

**Route:** `/clients`

**Purpose:** Client activity status with drill-down to time and task breakdown.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Filters Bar]                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Total        │ │ Red          │ │ Amber        │        │
│  │ Clients      │ │ Clients      │ │ Clients      │        │
│  │ 105          │ │ 4            │ │ 6            │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Client Health                                           ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Client       │ Assistant │ Active │ Last    │ Status   ││
│  │              │           │ Tasks  │ Task    │          ││
│  │ ────────────────────────────────────────────────────────││
│  │ John Smith   │ Brooke W  │ 0      │ 14d ago │ 🔴 Red   ││
│  │ [expandable - click for time/category breakdown]        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `v_client_health` — main table
- `v_client_time_breakdown` — for expanded row
- `v_tasks_detail` — for task list in expanded row

**Columns:**
| Column | Source |
|--------|--------|
| Client | `family_name` |
| Assistant | `assistant_name` |
| Contract | `contract` |
| Active Tasks | `active_tasks` |
| Completed (period) | Calculated from `v_tasks_detail` with date filter |
| Last Task | `days_since_last_task` formatted as "X days ago" |
| Total Time (period) | Sum from `v_toggl_detail` with date filter |
| Status | `health_status` |

**Expanded Row Shows:**
- **Time by Category:** Bar chart or table from `v_client_time_breakdown`
- **Recent Tasks:** List from `v_tasks_detail` filtered by family_id

---

### 5. Stuck Tasks

**Route:** `/stuck-tasks`

**Purpose:** Tasks that have been open too long and need attention.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Filters Bar]                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Stuck        │ │ Aging        │ │ Delayed      │        │
│  │ (7+ days)    │ │ (3-7 days)   │ │ (on hold)    │        │
│  │ 34           │ │ 13           │ │ 299          │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Tasks Needing Attention                      [Toggle: ] ││
│  │                                    Stuck | Aging | All  ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Task Title   │ Client    │ Assistant │ Days │ Status   ││
│  │ ────────────────────────────────────────────────────────││
│  │ Summer party │ John S    │ Brooke W  │ 41   │ Delayed  ││
│  │ Find trousers│ Jane D    │ Brooke W  │ 40   │ Delayed  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `v_stuck_tasks` — all data

**Columns:**
| Column | Source |
|--------|--------|
| Task Title | `task_title` |
| Client | `family_name` |
| Assistant | `assistant_name` |
| Days Open | `days_open` |
| State | `task_state` |
| Category | `category` |
| Status | `stuck_status` |

**Filters specific to this page:**
- Toggle: Stuck / Aging / Delayed / All

---

## Navigation

**Sidebar (left, collapsible):**

```
┌─────────────┐
│ BlckBx      │
│ Assistant   │
│ Manager     │
├─────────────┤
│ 🏠 Home     │
│ 👥 Team     │
│ 📊 Capacity │
│ 💚 Clients  │
│ ⏰ Stuck    │
└─────────────┘
```

- Icons from Lucide React
- Active state: `assistant-dark` background with white text
- Hover state: `sand-200` background
- Collapsed state: icons only

---

## Components to Build

### Core Components

| Component | Purpose |
|-----------|---------|
| `Layout` | Sidebar + main content wrapper |
| `Sidebar` | Navigation with collapse |
| `FilterBar` | Global filters (time, assistant, client, contract, status) |
| `StatCard` | Summary metric card with optional trend |
| `AlertCard` | Summary card with red/amber counts, clickable |
| `DataTable` | Sortable, filterable table with expandable rows |
| `StatusBadge` | Red/Amber/Green pill |
| `CapacityBar` | Visual capacity indicator |
| `ExpandableRow` | Table row that expands to show details |

### Hooks

| Hook | Purpose |
|------|---------|
| `useFilters` | Manage global filter state (URL params) |
| `useDashboardAlerts` | Fetch `v_dashboard_alerts` |
| `useClientHealth` | Fetch `v_client_health` with filters |
| `useFOHPerformance` | Fetch `v_foh_performance` with filters |
| `useFOHCapacity` | Fetch `v_foh_capacity` |
| `useStuckTasks` | Fetch `v_stuck_tasks` with filters |
| `useTasksDetail` | Fetch `v_tasks_detail` with filters |
| `useTogglDetail` | Fetch `v_toggl_detail` with filters |
| `useClientTimeBreakdown` | Fetch `v_client_time_breakdown` |
| `useAssistants` | Fetch assistants for filter dropdown |
| `useFamilies` | Fetch families for filter dropdown |

---

## API Query Examples

### PostgREST Filtering

```typescript
// Get red/amber clients
const { data } = await fetch(
  `${API_URL}/v_client_health?health_status=in.(Red,Amber)&order=days_since_last_task.desc`
);

// Get tasks completed in date range
const { data } = await fetch(
  `${API_URL}/v_tasks_detail?closed_date=gte.2026-02-04&closed_date=lte.2026-02-11&assistant_id=eq.${assistantId}`
);

// Get time entries for a client in date range
const { data } = await fetch(
  `${API_URL}/v_toggl_detail?family_id=eq.${familyId}&entry_date=gte.2026-02-04&entry_date=lte.2026-02-11`
);

// Get stuck tasks for an assistant
const { data } = await fetch(
  `${API_URL}/v_stuck_tasks?stuck_status=eq.Stuck&assistant_name=eq.Brooke%20Warner`
);
```

---

## File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   └── FilterBar.tsx
│   ├── ui/
│   │   ├── StatCard.tsx
│   │   ├── AlertCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CapacityBar.tsx
│   │   └── ExpandableRow.tsx
│   └── charts/
│       └── CategoryBreakdown.tsx
├── hooks/
│   ├── useFilters.ts
│   ├── useDashboardAlerts.ts
│   ├── useClientHealth.ts
│   ├── useFOHPerformance.ts
│   ├── useFOHCapacity.ts
│   ├── useStuckTasks.ts
│   ├── useTasksDetail.ts
│   ├── useTogglDetail.ts
│   ├── useClientTimeBreakdown.ts
│   ├── useAssistants.ts
│   └── useFamilies.ts
├── pages/
│   ├── Home.tsx
│   ├── Performance.tsx
│   ├── Capacity.tsx
│   ├── Clients.tsx
│   └── StuckTasks.tsx
├── lib/
│   └── neon.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

---

## Environment Variables

```env
VITE_NEON_DATA_API_URL=https://ep-super-bar-ab7k73ss.apirest.eu-west-2.aws.neon.tech/neondb/rest/v1
```

---

## Deployment

- Deploy to Coolify (same server as current dashboard)
- Use Nixpacks build pack
- Basic Auth via Coolify for now
- Separate subdomain (e.g., `manager.blckbx.co.uk` or similar obscure name)

---

## Future Enhancements (Not in V1)

- Authentication with Google OAuth via Neon Auth
- Role-based views (Manager vs Assistant)
- Email/Slack alerts for red status items
- Export to CSV
- Comparison to previous period trends
- BOH data when Plane integration is complete