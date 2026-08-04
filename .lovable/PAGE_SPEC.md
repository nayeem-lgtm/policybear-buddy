# Policy Bear CRM — page authoring spec (for page-building tasks)

Stack: TanStack Start v1 + React 19 + Tailwind v4 + shadcn/ui. Frontend only, mock data,
no backend calls. Every page must look like a real, finished internal tool screen.

## Route file convention

File: `src/routes/_shell.<segments-with-dots>.tsx`
Route id: `createFileRoute("/_shell/<segments-with-slashes>")`

Example: `src/routes/_shell.attendance-exceptions.tsx` →
`createFileRoute("/_shell/attendance-exceptions")`.
`src/routes/_shell.callbacks.calendar.tsx` → `createFileRoute("/_shell/callbacks/calendar")`.

Never edit `src/routeTree.gen.ts`. Never create `tailwind.config.*`.

## Required shape of every page file

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";

export const Route = createFileRoute("/_shell/<path>")({
  head: () => ({
    meta: [
      { title: "<Page> — Policy Bear CRM" },
      { name: "description", content: "<unique 1-line description>" },
      { property: "og:title", content: "<Page> — Policy Bear CRM" },
      { property: "og:description", content: "<unique 1-line description>" },
    ],
  }),
  component: <Page>Page,
});

function <Page>Page() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="<Sidebar group>" title="<Page>" description="…" actions={…} />
      {/* stat cards → filter bar → table / panels */}
    </div>
  );
}
```

No module-scope statements referencing the component (no `X.displayName = …`).
Titles/descriptions must be unique per page.

## Available primitives (read them before use)

- `@/components/crm/PageHeader` — `{ eyebrow?, title, description?, actions? }`
- `@/components/crm/StatCard` — `{ label, value, hint?, delta?: {value, direction}, tone?: "default"|"brand"|"success"|"warning"|"danger"|"info", icon? }`
- `@/components/crm/FilterBar` — `{ search, onSearchChange, searchPlaceholder, filters: {key,label,options[]}[], values, onChange, onReset, trailing? }`
- `@/components/crm/DataTable` — `{ columns: {key, header, cell:(row)=>node, align?, className?}[], rows, onRowClick?, empty?, footer? }`
- `@/components/crm/StatusBadge` — `{ status, tone? }` (tones auto-mapped for common statuses)
- `@/components/crm/Timeline` — `{ items: {time, event, detail?, tone?, trailing?}[] }`
- `@/lib/use-filters` → `useFilters(rows, { searchFields: r => [...], filters: { key: r => value } })`
  returns `{ search, setSearch, values, setValue, reset, filtered }`
- shadcn ui under `@/components/ui/*`: button, card, badge, input, label, select, tabs,
  table, dialog, sheet, switch, separator, progress, avatar, tooltip, dropdown-menu,
  textarea, checkbox, scroll-area, sidebar, sonner, skeleton, radio-group, accordion.
  Check the file exists (`ls src/components/ui`) before importing; if missing, use what exists.
- `@/lib/mock-data` — employees, customers, calls, callbacks, policies, carriers, quotePlans,
  qaReviews, publishers, payrollRows, courses, lessonsByCourse, automations, tasks,
  notifications, announcements, integrations, incidents, expenses, documents, auditLogs,
  leaveRequests, chargebacks, shiftTimeline, salesTrend, revenueTrend, ROLES, PRESENCE_STATUSES,
  currentUser. Inspect the file for exact field names — do not guess. If a page needs data
  that does not exist, define a local `const` array at the top of the page file (not in mock-data).
- `@/context/AuthContext` → `useAuth()` for `user` / `hasCapability`.
- `@/context/ShiftContext` → shift + alarm state (attendance pages only).

## Design rules (hard)

- Only semantic tokens: `bg-background`, `bg-card`, `bg-surface`, `text-foreground`,
  `text-muted-foreground`, `text-brand`, `bg-brand`, `text-success`, `bg-warning`,
  `text-destructive`, `border-border`, `shadow-card`. NEVER `text-white`, `bg-black`,
  `bg-[#...]`, or raw color utilities like `bg-blue-500`.
- Dense, professional back-office look. Keep dashboards uncluttered: prefer dropdown filters
  over walls of numbers. Max ~4 stat cards per page.
- Responsive: stat grids `grid gap-3 sm:grid-cols-2 xl:grid-cols-4`, tables scroll inside DataTable.
- Use lucide-react icons that match the domain.
- Charts: use `recharts` only if already in package.json; otherwise draw simple CSS bar rows.

## Quality bar

- Real-feeling content: names, dates, currency, statuses — no "Lorem" and no "Coming soon"
  placeholder pages.
- Interactivity where it's cheap and local: filters, tabs, dialogs, switches, row selection,
  drawer detail panels. No network calls, no backend, no Supabase.
- Must typecheck. Run `bunx tsgo --noEmit` (or `npx tsgo --noEmit`) at the end and fix errors
  in files you created. Do not "fix" errors by deleting other people's files.
- Only create/modify the route files assigned to you. Do not touch shared components,
  mock-data.ts, sidebar, or other agents' routes.
