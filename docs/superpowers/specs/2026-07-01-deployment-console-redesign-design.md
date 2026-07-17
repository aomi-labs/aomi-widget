# Deployment Console Redesign (Vercel-style, modular)

- **Date:** 2026-07-01
- **Status:** Approved design, ready for implementation plan
- **Repo:** `aomi-widget` (`apps/portal`)
- **Branch:** `feat/deployment-sdk-guardrails`

## Context

The current `/deployments` page renders a single `DeploymentConsole`
(`apps/portal/src/features/launch/components/deployment-console.tsx`, ~655 lines).
It crams a project list, a deployment table, and a details side panel into one
3-column grid on one screen. Its left nav (Environment/Settings) and its
Deployments/Domains/Logs tabs are non-functional placeholders, and it fetches
full deployment history for **every** source on load (N × GitHub API calls).

We are redesigning it into a Vercel-style console: a project **index** that you
drill into for a dedicated per-project page with **Deployments / Environment /
Settings** sections. A hard requirement is **modularity** — small, single-purpose
files with explicit interfaces, replacing the monolithic component.

## Goals

- Project index at `/deployments`; per-project page at `/deployments/[sourceId]`.
- Per-project **Deployments**, **Environment**, **Settings** sections.
- Read-only over existing backend APIs (no env writes this pass).
- Decompose the monolith into small, independently-understandable modules.
- Fix the history fan-out: the index must not fetch per-project history.

## Non-goals (v1)

- No environment/secret **writes** (durable-write path is still blocked pending
  the `/api/_internal/secrets` owner decision).
- No Domains or Logs tabs.
- No project rename/delete/disconnect (Settings "danger zone" is a disabled
  placeholder — no backend endpoint exists).
- No new backend endpoints except a thin BFF proxy for reading secrets.

## Entity mapping

A **project** = a `UserSource` (a GitHub-connected/forked source repo) as
returned by the existing `deploymentSources()`. Each project has `apps[]`,
`latestDeployment`, and (on demand) deployment `history`.

## Information architecture & routing

- **`/deployments`** — Project index.
  - Global SDK banner (required version, from `deploymentSdkStatus()`).
  - A list of project rows. Each row: repo name + avatar initial, latest
    deployment status dot, live-app count, SDK badge (stamped vs required),
    last-activity. Row click → project page.
  - States: loading / signed-out (GitHub sign-in panel) / error / empty.
- **`/deployments/[sourceId]`** — Project page.
  - Header: repo name, GitHub link, latest status, Refresh.
  - Tabs via `?tab=deployments|environment|settings` (query param, default
    `deployments`). Query param chosen over nested route segments for
    simplicity and to keep a single page file per project.
  - **Deployments tab** — history table (`deploymentHistory({appSourceId})`),
    one `DeploymentRow` per historical deployment, each with a **Rollback**
    action guarded by a confirm step.
  - **Environment tab** — read-only, redacted secret handles grouped by app.
    Source: new `listSecrets()` → `GET /api/secrets` (`by_app`), filtered to
    this project's app names. Shows handle name, scope, `configured` — never
    values. Empty-state + note that durable writes are pending.
  - **Settings tab** — read-only metadata: repository, source id, installation
    id, deploy branch; required vs latest-stamped SDK with a compatibility
    badge; a disabled danger-zone placeholder.
  - States handled per tab (loading / error / empty / signed-out).

## Module breakdown

Each module below states **what it does**, **how it's used (interface)**, and
**what it depends on**. New directory: `features/launch/components/deployments/`.

### Routing entry points
- `app/deployments/page.tsx` — renders `<ProjectIndex />` inside `ErrorBoundary`.
  Depends on: `ProjectIndex`.
- `app/deployments/[sourceId]/page.tsx` — reads `sourceId` param, renders
  `<ProjectPage sourceId={n} />` inside `ErrorBoundary`. Depends on: `ProjectPage`.

### Data layer (no UI)
- `features/launch/hooks/use-projects.ts` — `useProjects()` → `{ status,
  sources, sdk, github, reload }`. Loads GitHub session + `deploymentSources()`
  + `deploymentSdkStatus()`. **Does not** load history. Depends on: launch
  `client` fns, `fetchGitHubSession`.
- `features/launch/hooks/use-project-detail.ts` — `useProjectDetail(sourceId)`
  → fetches `deploymentSources()` and selects the source by id, and exposes lazy
  loaders `loadHistory()` and `loadSecrets()` (each fetched only when its tab
  opens). Depends on: `deploymentSources`, `deploymentHistory`,
  `deploymentSecrets`.
- `packages/deploy` client: add `listSecrets(input)` calling
  `GET /api/secrets`. BFF: add `GET /bff/deployments/secrets` +
  `deploymentSecrets()` launch-client fn + `API_PATHS.bff.deployments.secrets`.

### Index
- `deployments/project-index.tsx` — `<ProjectIndex />`. Composes `SdkBanner`,
  `ProjectRow` list, and shared state panels. Depends on: `useProjects`,
  `ProjectRow`, `SdkBanner`, state panels.
- `deployments/project-row.tsx` — `<ProjectRow source sdk />` (presentational,
  links to `/deployments/[id]`). Depends on: `StatusDot`, `SdkBadge`.

### Project page + tabs
- `deployments/project-page.tsx` — `<ProjectPage sourceId />`. Owns header +
  tab selection (reads/writes `?tab=`), renders the active tab. Depends on:
  `useProjectDetail`, the three tab components, `ProjectHeader`.
- `deployments/project-header.tsx` — `<ProjectHeader source latest onRefresh />`.
  Presentational. Depends on: `StatusPill`.
- `deployments/tabs/deployments-tab.tsx` — `<DeploymentsTab source />`. Loads
  history, renders `DeploymentRow` list, owns rollback + confirm state.
  Depends on: `deploymentHistory`, `deploymentRollback`, `DeploymentRow`,
  `ConfirmDialog`.
- `deployments/tabs/environment-tab.tsx` — `<EnvironmentTab source />`. Loads
  and lists redacted handles by app. Depends on: `listSecrets`/`deploymentSecrets`.
- `deployments/tabs/settings-tab.tsx` — `<SettingsTab source sdk />`.
  Presentational read-only metadata + compatibility badge + disabled danger zone.
  Depends on: `SdkBadge`.

### Shared primitives (presentational, no data fetching)
- `deployments/ui/deployment-row.tsx` — `<DeploymentRow deployment source
  requiredSdk onRollback running message />`.
- `deployments/ui/status-pill.tsx`, `ui/status-dot.tsx` — status → color.
- `deployments/ui/sdk-badge.tsx` — `<SdkBadge stamped required />` →
  ok/outdated/missing visual.
- `deployments/ui/confirm-dialog.tsx` — minimal confirm used by rollback.
- `deployments/ui/state-panels.tsx` — `LoadingPanel`, `ErrorPanel`,
  `EmptyPanel`, `GitHubSignInPanel` (moved out of the monolith).

### Barrel / cleanup
- `deployments/index.ts` re-exports `ProjectIndex`, `ProjectPage`.
- `features/launch/components/index.ts` exports the two new entry components.
- Delete `deployment-console.tsx` once its pieces are migrated; keep
  `deploy-dashboard.tsx` (one-click launch flow) untouched.

## Data flow

- **Index:** `useProjects()` → session + `deploymentSources()` + sdk-status.
  Each row uses `source.latestDeployment` only. **No history fan-out.**
- **Project page:** on mount / tab open, lazily fetch:
  - Deployments tab → `deploymentHistory({ appSourceId })`.
  - Environment tab → `deploymentSecrets({ appSourceId })`.
  - Settings tab → uses already-loaded source + sdk-status (no fetch).

## Rollback confirmation

Rollback in the Deployments tab requires an explicit confirm (`ConfirmDialog`)
before calling `deploymentRollback`. The backend SDK/legacy gate (409) remains
the authoritative backstop; the confirm prevents accidental clicks.

## States

Every data surface renders one of: loading, signed-out (GitHub sign-in panel,
with the existing `github_error` messages), error (message), empty, or ready.
Shared `state-panels.tsx` provides these so each view stays small.

## Testing

Component tests (mock launch `client` fns, not the backend):
- Index: renders project rows; loading/signed-out/error/empty states; row links
  to `/deployments/[id]`; **does not call `deploymentHistory`**.
- Project page: tab switching via `?tab=`; default tab is deployments.
- Deployments tab: renders history rows; rollback shows confirm; confirm →
  `deploymentRollback`; blocked (409) surfaces the structured error.
- Environment tab: renders redacted handles; asserts **no secret values** are
  rendered; empty-state note shown when none.
- Settings tab: compatibility badge reflects stamped vs required SDK.
- `listSecrets`/BFF: returns redacted handles; unauthorized path handled.

## Caveats / open items

- **Secret visibility depends on session/client scoping.** `GET /api/secrets`
  resolves the client from the session; app-scoped handles registered via the
  service path (`/api/_internal/secrets`) are keyed by `user_id`. The
  Environment tab may show an empty list depending on how the portal session
  resolves the client for a given user. This is acceptable for the read-only
  pass and is called out in the UI empty-state.
- Durable per-deployment env **writes** remain out of scope until the
  `/api/_internal/secrets` service-owner decision is made.

## File-change summary

- **Add:** `app/deployments/[sourceId]/page.tsx`; `features/launch/hooks/{use-projects,use-project-detail}.ts`;
  `features/launch/components/deployments/**` (index, project-index, project-row,
  project-page, project-header, tabs/*, ui/*); `bff/deployments/secrets/route.ts`
  + `deploymentSecrets()` + `listSecrets()` + api-path.
- **Change:** `app/deployments/page.tsx` (render `ProjectIndex`);
  `features/launch/components/index.ts` (exports); `packages/deploy` client/types.
- **Remove:** `deployment-console.tsx` after migration.
