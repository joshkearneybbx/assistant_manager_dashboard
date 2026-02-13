# Assistant Manager Dashboard

Operational dashboard for BlckBx assistant management.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query
- Recharts
- Neon Serverless SDK

## Setup
1. Install dependencies:
   - `pnpm install`
2. Copy env values:
   - `cp .env.example .env`
3. Start local dev server:
   - `pnpm dev`

## Environment
Required variables:
- `VITE_NEON_DATABASE_URL`

The app uses the Neon serverless SQL client:
- `sql\`SELECT * FROM ...\``

## Scripts
- `pnpm dev` - run dev server
- `pnpm build` - typecheck + production build
- `pnpm preview` - preview production build
- `pnpm test` - run Vitest tests

## Routes
- `/` Home
- `/performance` Assistant Performance
- `/capacity` Capacity
- `/clients` Client Health
- `/stuck-tasks` Stuck Tasks
