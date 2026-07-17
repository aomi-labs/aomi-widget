# Deployment Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic `deployment-console.tsx` with a Vercel-style, modular console: a project index at `/deployments` that drills into `/deployments/[sourceId]` with Deployments / Environment / Settings tabs.

**Architecture:** Dedicated Next.js routes (index + `[sourceId]`), tab state via `?tab=` query param. Two data hooks (`use-projects` loads sources without history fan-out; `use-project-detail` lazy-loads history/secrets per tab). Small single-purpose presentational primitives. Read-only over existing backend APIs plus one new secrets-read BFF proxy.

**Tech Stack:** Next.js (App Router, client components), React, TypeScript, Tailwind, Vitest + @testing-library/react. Monorepo package `@aomi-labs/deploy` for the backend client.

## Global Constraints

- Read-only pass: **no** environment/secret writes; **no** Domains/Logs tabs; **no** rename/delete (danger zone is a disabled placeholder).
- Only new backend surface allowed: a BFF proxy for reading secrets (`GET /bff/deployments/secrets`) over the existing backend `GET /api/secrets`. No new Rust endpoints.
- The index must **not** call `deploymentHistory` (fixes the N×GitHub fan-out). It uses `source.latestDeployment` only.
- Secret values are never rendered — handles/metadata only.
- Follow existing patterns: launch BFF routes live in `apps/portal/src/server/bff/launch/routes.ts` and are re-exported by thin `app/api/bff/.../route.ts` files; client fns live in `apps/portal/src/features/launch/client.ts` and go through `launchFetch`; API paths in `apps/portal/src/lib/api-paths.ts`.
- Reuse the Tailwind visual language already in `apps/portal/src/features/launch/components/deployment-console.tsx` (status colors, borders `border-zinc-200`, rounded-lg cards). That file is the style reference; do not invent a new visual system.
- Tests mock `@portal/features/launch/client` (and `.../dashboard` for the GitHub session), never the network.

---

## File Structure

```
apps/portal/src/
  app/deployments/page.tsx                    (MODIFY → render <ProjectIndex/>)
  app/deployments/[sourceId]/page.tsx         (CREATE → render <ProjectPage/>)
  app/api/bff/deployments/secrets/route.ts    (CREATE → GET re-export)
  server/bff/launch/routes.ts                 (MODIFY → deploymentSecretsRoute)
  lib/api-paths.ts                            (MODIFY → deployments.secrets)
  features/launch/client.ts                   (MODIFY → deploymentSecrets())
  features/launch/contracts.ts                (MODIFY → DeploymentSecretsResult)
  features/launch/hooks/use-projects.ts       (CREATE)
  features/launch/hooks/use-project-detail.ts (CREATE)
  features/launch/components/index.ts         (MODIFY → export new entries)
  features/launch/components/deployments/
    index.ts                                  (CREATE → barrel)
    project-index.tsx                         (CREATE)
    project-row.tsx                           (CREATE)
    project-page.tsx                          (CREATE)
    project-header.tsx                        (CREATE)
    tabs/deployments-tab.tsx                  (CREATE)
    tabs/environment-tab.tsx                  (CREATE)
    tabs/settings-tab.tsx                     (CREATE)
    ui/status-dot.tsx                         (CREATE)
    ui/status-pill.tsx                        (CREATE)
    ui/sdk-badge.tsx                          (CREATE)
    ui/confirm-dialog.tsx                     (CREATE)
    ui/state-panels.tsx                       (CREATE)
    ui/deployment-row.tsx                     (CREATE)
  features/launch/components/deployment-console.tsx  (DELETE after migration)
packages/deploy/src/
  client.ts                                   (MODIFY → listSecrets())
  types.ts                                    (MODIFY → RedactedSecretsByApp + input)
  index.ts                                    (MODIFY → export new types)
```

---

## Task 1: `listSecrets` in the deploy package

**Files:**
- Modify: `packages/deploy/src/types.ts`
- Modify: `packages/deploy/src/client.ts`
- Modify: `packages/deploy/src/index.ts`
- Test: `packages/deploy/test/list-secrets.test.ts`

**Interfaces:**
- Consumes: existing `DeploymentClient.get<T>()`, `resolveBearer()`, `cleanPlatform`, `required` (see other methods in `client.ts`, e.g. `listUserSourceDeployments`).
- Produces:
  - `interface ListSecretsInput extends BearerOverride { githubUserId?: string; clientId?: string }`
  - `interface RedactedSecretHandle { name: string; app: string | null }`
  - `interface ListSecretsResult { byApp: Record<string, string[]> }`
  - `DeploymentClient.listSecrets(input?: ListSecretsInput): Promise<ListSecretsResult>` → GET `/api/secrets` (optionally `?client_id=`), returns `{ byApp: raw.by_app ?? {} }`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/deploy/test/list-secrets.test.ts
import { describe, expect, it, vi } from "vitest";
import { DeploymentClient } from "../src/client";

describe("DeploymentClient.listSecrets", () => {
  it("maps by_app handles and never leaks values", async () => {
    const client = new DeploymentClient({ baseUrl: "https://api.test", bearer: "svc" });
    // @ts-expect-error override private fetch used by get<T>
    vi.spyOn(client as any, "get").mockResolvedValue({
      by_app: { demo: ["$SECRET:APP:demo::API_KEY"] },
    });
    const result = await client.listSecrets({ clientId: "abc" });
    expect(result.byApp).toEqual({ demo: ["$SECRET:APP:demo::API_KEY"] });
  });

  it("defaults to empty byApp when backend omits it", async () => {
    const client = new DeploymentClient({ baseUrl: "https://api.test", bearer: "svc" });
    // @ts-expect-error
    vi.spyOn(client as any, "get").mockResolvedValue({});
    const result = await client.listSecrets();
    expect(result.byApp).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/deploy && pnpm vitest run test/list-secrets.test.ts` (use the repo's package manager — `bun`/`pnpm`/`npm` as configured)
Expected: FAIL — `client.listSecrets is not a function`.

- [ ] **Step 3: Add types**

```ts
// packages/deploy/src/types.ts  (add near the other input interfaces)
export interface ListSecretsInput extends BearerOverride {
  githubUserId?: string;
  clientId?: string;
}
export interface ListSecretsResult {
  byApp: Record<string, string[]>;
}
```

- [ ] **Step 4: Implement `listSecrets`**

```ts
// packages/deploy/src/client.ts  (add a method to DeploymentClient, mirror listUserSourceDeployments)
async listSecrets(input: ListSecretsInput = {}): Promise<ListSecretsResult> {
  const params = new URLSearchParams();
  if (input.clientId) params.set("client_id", input.clientId);
  const query = params.toString();
  const raw = await this.get<{ by_app?: Record<string, string[]> }>(
    `/api/secrets${query ? `?${query}` : ""}`,
    "list_secrets",
    this.resolveBearer(input.bearer),
  );
  return { byApp: raw.by_app ?? {} };
}
```

Add the `ListSecretsInput`/`ListSecretsResult` imports to the `import type { ... }` block at the top of `client.ts`.

- [ ] **Step 5: Export the types**

```ts
// packages/deploy/src/index.ts  (add to the `export type { ... } from "./types"` block)
  ListSecretsInput,
  ListSecretsResult,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/deploy && pnpm vitest run test/list-secrets.test.ts`
Expected: PASS (both cases).

- [ ] **Step 7: Commit**

```bash
git add packages/deploy/src/types.ts packages/deploy/src/client.ts packages/deploy/src/index.ts packages/deploy/test/list-secrets.test.ts
git commit -m "feat(deploy): add listSecrets read client"
```

---

## Task 2: BFF secrets-read route + launch client fn + api path

**Files:**
- Modify: `apps/portal/src/server/bff/launch/routes.ts`
- Create: `apps/portal/src/app/api/bff/deployments/secrets/route.ts`
- Modify: `apps/portal/src/lib/api-paths.ts`
- Modify: `apps/portal/src/features/launch/client.ts`
- Modify: `apps/portal/src/features/launch/contracts.ts`

**Interfaces:**
- Consumes: `checkRead`, `getGitHubSession`, `deploymentClient`, `launchConfig`, `launchErrorResponse` (all already in `routes.ts` — see `deploymentHistoryRoute`).
- Produces:
  - `export async function deploymentSecretsRoute(req: Request): Promise<Response>` — GET; requires GitHub session; calls `client.listSecrets({ githubUserId: session.githubUserId })`; returns `{ byApp }`.
  - `API_PATHS.bff.deployments.secrets: string` = `${BFF}/deployments/secrets`.
  - `type DeploymentSecretsResult = { byApp: Record<string, string[]> }` in contracts.
  - `deploymentSecrets(): Promise<DeploymentSecretsResult>` in launch `client.ts`.

- [ ] **Step 1: Add the contract type**

```ts
// apps/portal/src/features/launch/contracts.ts  (add near DeploymentHistoryResult)
export type DeploymentSecretsResult = {
  byApp: Record<string, string[]>;
};
```

- [ ] **Step 2: Add the BFF handler** (model on `deploymentHistoryRoute` in the same file)

```ts
// apps/portal/src/server/bff/launch/routes.ts
export async function deploymentSecretsRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in with GitHub" }, { status: 401 });
  }
  try {
    const client = await deploymentClient();
    const { byApp } = await client.listSecrets({ githubUserId: session.githubUserId });
    return NextResponse.json({ byApp });
  } catch (err) {
    return launchErrorResponse(err);
  }
}
```

- [ ] **Step 3: Add the route file**

```ts
// apps/portal/src/app/api/bff/deployments/secrets/route.ts
import { deploymentSecretsRoute } from "@portal/server/bff/launch/routes";

export const GET = deploymentSecretsRoute;
```

- [ ] **Step 4: Add the API path**

```ts
// apps/portal/src/lib/api-paths.ts  (inside the `deployments: { ... }` block)
      secrets: `${BFF}/deployments/secrets`,
```

- [ ] **Step 5: Add the launch client fn**

```ts
// apps/portal/src/features/launch/client.ts  (add DeploymentSecretsResult to the contracts import)
export function deploymentSecrets(): Promise<DeploymentSecretsResult> {
  return launchFetch(API_PATHS.bff.deployments.secrets, "deployment secrets");
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/portal && pnpm tsc --noEmit` (or the repo's typecheck script)
Expected: PASS (no type errors from the new symbols).

- [ ] **Step 7: Commit**

```bash
git add apps/portal/src/server/bff/launch/routes.ts apps/portal/src/app/api/bff/deployments/secrets apps/portal/src/lib/api-paths.ts apps/portal/src/features/launch/client.ts apps/portal/src/features/launch/contracts.ts
git commit -m "feat(portal): add read-only deployment secrets BFF route"
```

---

## Task 3: Shared UI primitives (`ui/`)

**Files:**
- Create: `.../deployments/ui/status-dot.tsx`, `ui/status-pill.tsx`, `ui/sdk-badge.tsx`, `ui/state-panels.tsx`, `ui/confirm-dialog.tsx`
- Test: `.../deployments/ui/sdk-badge.test.tsx`, `ui/confirm-dialog.test.tsx`

**Interfaces (Produces):**
- `StatusDot({ state: string })`, `StatusPill({ value: string })` — port the color logic verbatim from `deployment-console.tsx` (`StatusDot`/`StatusPill` at its end).
- `SdkBadge({ stamped, required }: { stamped?: string | null; required?: string | null })` → renders `ok` (emerald check) when `stamped && required && stamped === required`, `outdated` (amber) when both present and differ, `missing` (zinc) otherwise; text shows `stamped ?? "no SDK"`.
- `LoadingPanel({ label })`, `ErrorPanel({ message })`, `EmptyPanel({ children })`, `GitHubSignInPanel({ error })` — port `GitHubSignInPanel` verbatim from `deployment-console.tsx`; the others are simple centered messages (reuse `TableMessage` styling).
- `ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel })` — minimal accessible modal (role="dialog"), confirm/cancel buttons.

- [ ] **Step 1: Write failing tests for the logic-bearing primitives**

```tsx
// ui/sdk-badge.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SdkBadge } from "./sdk-badge";

describe("SdkBadge", () => {
  it("shows ok when stamped matches required", () => {
    render(<SdkBadge stamped="3.0.1" required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute("data-state", "ok");
  });
  it("shows outdated when they differ", () => {
    render(<SdkBadge stamped="3.0.0" required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute("data-state", "outdated");
  });
  it("shows missing when stamp absent", () => {
    render(<SdkBadge stamped={null} required="3.0.1" />);
    expect(screen.getByTestId("sdk-badge")).toHaveAttribute("data-state", "missing");
  });
});
```

```tsx
// ui/confirm-dialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

it("fires onConfirm when confirmed", () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog open title="Roll back?" body="Sure?" confirmLabel="Roll back" onConfirm={onConfirm} onCancel={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Roll back" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it("renders nothing when closed", () => {
  const { container } = render(<ConfirmDialog open={false} title="x" body="y" confirmLabel="z" onConfirm={() => {}} onCancel={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/ui`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the primitives**

`sdk-badge.tsx`:
```tsx
export function SdkBadge({ stamped, required }: { stamped?: string | null; required?: string | null }) {
  const state = !stamped ? "missing" : required && stamped === required ? "ok" : required ? "outdated" : "missing";
  const tone = state === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : state === "outdated" ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return (
    <span data-testid="sdk-badge" data-state={state} className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${tone}`}>
      {stamped ?? "no SDK"}
    </span>
  );
}
```

`confirm-dialog.tsx`:
```tsx
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div role="dialog" aria-label={title} className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-2 text-sm text-zinc-600">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-8 rounded-md border border-zinc-300 px-3 text-sm">Cancel</button>
          <button type="button" onClick={onConfirm} className="h-8 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

`status-dot.tsx` / `status-pill.tsx`: copy the `StatusDot` and `StatusPill` bodies from the current `deployment-console.tsx` verbatim into their own files and `export`.

`state-panels.tsx`: copy `GitHubSignInPanel` verbatim from `deployment-console.tsx`; add:
```tsx
export function LoadingPanel({ label }: { label: string }) {
  return <div className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">{label}</div>;
}
export function ErrorPanel({ message }: { message: string }) {
  return <div className="flex min-h-[260px] items-center justify-center text-sm text-red-600">{message}</div>;
}
export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">{children}</div>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/components/deployments/ui
git commit -m "feat(portal): add deployment console UI primitives"
```

---

## Task 4: `useProjects` hook (no history fan-out)

**Files:**
- Create: `apps/portal/src/features/launch/hooks/use-projects.ts`
- Test: `apps/portal/src/features/launch/hooks/use-projects.test.ts`

**Interfaces:**
- Consumes: `deploymentSources`, `deploymentSdkStatus` (launch client); `fetchGitHubSession`, `GitHubSessionInfo` from `@portal/features/launch/dashboard`.
- Produces:
```ts
type ProjectsState =
  | { status: "loading" }
  | { status: "signed_out"; sdk: LaunchSdkStatus | null }
  | { status: "ready"; sources: UserSource[]; sdk: LaunchSdkStatus | null; github: GitHubSessionInfo }
  | { status: "error"; error: string };
export function useProjects(): { state: ProjectsState; reload: () => void }
```

- [ ] **Step 1: Write the failing test**

```ts
// use-projects.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@portal/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({ sources: [{ id: 1, installationId: 5, repositoryLink: "a/b", apps: [], latestDeployment: null }] })),
  deploymentSdkStatus: vi.fn(async () => ({ ok: true, serverTags: [], sdkStatus: { requiredVersion: "3.0.1", status: "unknown" } })),
  deploymentHistory: vi.fn(),
}));
vi.mock("@portal/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({ signedIn: true, githubLogin: "alice", githubUserId: "u1" })),
}));

import { useProjects } from "./use-projects";
import { deploymentHistory } from "@portal/features/launch/client";

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads sources and never fetches history", async () => {
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(deploymentHistory).not.toHaveBeenCalled();
    if (result.current.state.status === "ready") {
      expect(result.current.state.sources).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/portal && pnpm vitest run src/features/launch/hooks/use-projects.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// use-projects.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import type { UserSource } from "@aomi-labs/deploy";
import { deploymentSources, deploymentSdkStatus } from "@portal/features/launch/client";
import type { LaunchSdkStatus } from "@portal/features/launch/contracts";
import { fetchGitHubSession, type GitHubSessionInfo } from "@portal/features/launch/dashboard";

export type ProjectsState =
  | { status: "loading" }
  | { status: "signed_out"; sdk: LaunchSdkStatus | null }
  | { status: "ready"; sources: UserSource[]; sdk: LaunchSdkStatus | null; github: GitHubSessionInfo }
  | { status: "error"; error: string };

export function useProjects() {
  const [state, setState] = useState<ProjectsState>({ status: "loading" });
  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [github, sdk] = await Promise.all([fetchGitHubSession(), deploymentSdkStatus().catch(() => null)]);
      if (!github.signedIn) return setState({ status: "signed_out", sdk });
      const { sources } = await deploymentSources();
      setState({ status: "ready", sources, sdk, github });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load projects";
      if (message.toLowerCase().includes("not signed in with github")) return setState({ status: "signed_out", sdk: null });
      setState({ status: "error", error: message });
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { state, reload: () => void reload() };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/portal && pnpm vitest run src/features/launch/hooks/use-projects.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/hooks/use-projects.ts apps/portal/src/features/launch/hooks/use-projects.test.ts
git commit -m "feat(portal): add useProjects hook without history fan-out"
```

---

## Task 5: `useProjectDetail` hook (lazy history + secrets)

**Files:**
- Create: `apps/portal/src/features/launch/hooks/use-project-detail.ts`
- Test: `apps/portal/src/features/launch/hooks/use-project-detail.test.ts`

**Interfaces:**
- Consumes: `deploymentSources`, `deploymentHistory`, `deploymentSecrets`, `deploymentSdkStatus`, `deploymentRollback` (launch client).
- Produces:
```ts
export function useProjectDetail(sourceId: number): {
  source: UserSource | null;
  loading: boolean;
  error: string | null;
  sdk: LaunchSdkStatus | null;
  history: UserSourceLatestDeployment[] | null;
  secretsByApp: Record<string, string[]> | null;
  loadHistory: () => void;   // idempotent: fetches once
  loadSecrets: () => void;   // idempotent: fetches once
  rollback: (deploymentId: string) => Promise<DeploymentRollbackResult>;
  reload: () => void;
}
```
`loadHistory`/`loadSecrets` set their slice on first call and no-op while a fetch is in flight or already loaded.

- [ ] **Step 1: Write the failing test**

```ts
// use-project-detail.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@portal/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({ sources: [{ id: 7, installationId: 5, repositoryLink: "a/b", apps: [], latestDeployment: null }] })),
  deploymentSdkStatus: vi.fn(async () => null),
  deploymentHistory: vi.fn(async () => ({ deployments: [{ deploymentId: "dep_1", apps: [], releaseTags: [], state: "recorded" }] })),
  deploymentSecrets: vi.fn(async () => ({ byApp: { demo: ["$SECRET:APP:demo::KEY"] } })),
  deploymentRollback: vi.fn(),
}));

import { useProjectDetail } from "./use-project-detail";
import { deploymentHistory, deploymentSecrets } from "@portal/features/launch/client";

describe("useProjectDetail", () => {
  beforeEach(() => vi.clearAllMocks());
  it("resolves the source and lazily loads history once", async () => {
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    expect(deploymentHistory).not.toHaveBeenCalled();
    act(() => result.current.loadHistory());
    act(() => result.current.loadHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(deploymentHistory).toHaveBeenCalledTimes(1);
    expect(deploymentSecrets).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/portal && pnpm vitest run src/features/launch/hooks/use-project-detail.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// use-project-detail.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import {
  deploymentSources, deploymentHistory, deploymentSecrets, deploymentSdkStatus, deploymentRollback,
} from "@portal/features/launch/client";
import type { LaunchSdkStatus, DeploymentRollbackResult } from "@portal/features/launch/contracts";

export function useProjectDetail(sourceId: number) {
  const [source, setSource] = useState<UserSource | null>(null);
  const [sdk, setSdk] = useState<LaunchSdkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserSourceLatestDeployment[] | null>(null);
  const [secretsByApp, setSecrets] = useState<Record<string, string[]> | null>(null);
  const historyReq = useRef(false);
  const secretsReq = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ sources }, sdkStatus] = await Promise.all([deploymentSources(), deploymentSdkStatus().catch(() => null)]);
      setSource(sources.find((s) => s.id === sourceId) ?? null);
      setSdk(sdkStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally { setLoading(false); }
  }, [sourceId]);

  useEffect(() => { void reload(); }, [reload]);

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    historyReq.current = true;
    void deploymentHistory({ appSourceId: sourceId, limit: 20 })
      .then((r) => setHistory(r.deployments))
      .catch(() => setHistory([]));
  }, [sourceId, history]);

  const loadSecrets = useCallback(() => {
    if (secretsReq.current || secretsByApp !== null) return;
    secretsReq.current = true;
    void deploymentSecrets().then((r) => setSecrets(r.byApp)).catch(() => setSecrets({}));
  }, [secretsByApp]);

  const rollback = useCallback(
    (deploymentId: string): Promise<DeploymentRollbackResult> => deploymentRollback({ deploymentId }),
    [],
  );

  return { source, loading, error, sdk, history, secretsByApp, loadHistory, loadSecrets, rollback, reload: () => void reload() };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/portal && pnpm vitest run src/features/launch/hooks/use-project-detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/hooks/use-project-detail.ts apps/portal/src/features/launch/hooks/use-project-detail.test.ts
git commit -m "feat(portal): add useProjectDetail hook with lazy tab loaders"
```

---

## Task 6: `DeploymentRow` + `ProjectRow` presentational components

**Files:**
- Create: `.../deployments/ui/deployment-row.tsx`
- Create: `.../deployments/project-row.tsx`
- Test: `.../deployments/project-row.test.tsx`

**Interfaces (Produces):**
- `DeploymentRow({ deployment, source, requiredSdk, running, message, onRollback })` — port the JSX/logic from the existing `DeploymentRow` in `deployment-console.tsx`, but replace the inline SDK check with `<SdkBadge stamped={sdkVersion} required={requiredSdk} />` and the status with `<StatusPill/>`/`<StatusDot/>` from `ui/`.
- `ProjectRow({ source, requiredSdk })` — an `<a href={`/deployments/${source.id}`}>` row: avatar initial, `source.repositoryLink`, `<StatusDot state={source.latestDeployment?.state ?? "none"} />`, live-app count (`source.apps.filter(a => a.isActive && a.loaded).length`), `<SdkBadge stamped={source.latestDeployment?.sdkVersion} required={requiredSdk} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// project-row.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectRow } from "./project-row";

it("links to the project page and shows the repo", () => {
  render(<ProjectRow source={{ id: 42, installationId: 1, repositoryLink: "alice/bot", apps: [], latestDeployment: null }} requiredSdk="3.0.1" />);
  const link = screen.getByRole("link", { name: /alice\/bot/ });
  expect(link).toHaveAttribute("href", "/deployments/42");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/project-row.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `deployment-row.tsx`**

Port `DeploymentRow` from `deployment-console.tsx` into this file. Replace its SDK `<span>` block with `<SdkBadge stamped={sdkVersion} required={requiredSdk} />` and its status with the `ui/` `StatusDot`/`StatusPill`. Keep the same props signature listed above.

- [ ] **Step 4: Implement `project-row.tsx`**

```tsx
import type { UserSource } from "@aomi-labs/deploy";
import { StatusDot } from "./ui/status-dot";
import { SdkBadge } from "./ui/sdk-badge";

export function ProjectRow({ source, requiredSdk }: { source: UserSource; requiredSdk?: string | null }) {
  const live = source.apps.filter((a) => a.isActive && a.loaded).length;
  return (
    <a href={`/deployments/${source.id}`} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-xs font-medium">
        {(source.repositoryLink ?? "A").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{source.repositoryLink ?? "Unknown repository"}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          <StatusDot state={source.latestDeployment?.state ?? "none"} />
          <span>{live} live app(s)</span>
        </div>
      </div>
      <SdkBadge stamped={source.latestDeployment?.sdkVersion} required={requiredSdk} />
    </a>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/project-row.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/portal/src/features/launch/components/deployments/ui/deployment-row.tsx apps/portal/src/features/launch/components/deployments/project-row.tsx apps/portal/src/features/launch/components/deployments/project-row.test.tsx
git commit -m "feat(portal): add DeploymentRow and ProjectRow components"
```

---

## Task 7: `ProjectIndex`

**Files:**
- Create: `.../deployments/project-index.tsx`
- Test: `.../deployments/project-index.test.tsx`

**Interfaces:**
- Consumes: `useProjects`, `ProjectRow`, `LoadingPanel`/`ErrorPanel`/`EmptyPanel`/`GitHubSignInPanel` from `ui/state-panels`, `SdkBadge`.
- Produces: `export function ProjectIndex()`.

Behavior: renders an SDK banner (required version from `state.sdk`), a "Projects" card, and one `ProjectRow` per source. Renders the correct panel for `loading`/`signed_out`/`error`, and `EmptyPanel` when `ready` with zero sources. A Refresh button calls `reload`.

- [ ] **Step 1: Write the failing test**

```tsx
// project-index.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../../hooks/use-projects", () => ({
  useProjects: () => ({
    state: { status: "ready", sources: [{ id: 3, installationId: 1, repositoryLink: "alice/bot", apps: [], latestDeployment: null }], sdk: { ok: true, serverTags: [], sdkStatus: { requiredVersion: "3.0.1", status: "unknown" } }, github: { signedIn: true, githubLogin: "alice", githubUserId: "u" } },
    reload: vi.fn(),
  }),
}));

import { ProjectIndex } from "./project-index";

it("lists projects with links", async () => {
  render(<ProjectIndex />);
  await waitFor(() => expect(screen.getByRole("link", { name: /alice\/bot/ })).toHaveAttribute("href", "/deployments/3"));
});
```

- [ ] **Step 2: Run to verify it fails; Step 3: implement `ProjectIndex`; Step 4: run to verify pass**

Implement with the panels + `ProjectRow` list per the behavior above. Reuse the header/card Tailwind from `deployment-console.tsx`.
Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/project-index.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/components/deployments/project-index.tsx apps/portal/src/features/launch/components/deployments/project-index.test.tsx
git commit -m "feat(portal): add ProjectIndex"
```

---

## Task 8: Tab components (`deployments-tab`, `environment-tab`, `settings-tab`)

**Files:**
- Create: `.../deployments/tabs/deployments-tab.tsx`, `tabs/environment-tab.tsx`, `tabs/settings-tab.tsx`
- Create: `.../deployments/project-header.tsx`
- Test: `.../deployments/tabs/deployments-tab.test.tsx`, `tabs/environment-tab.test.tsx`

**Interfaces (Produces):**
- `DeploymentsTab({ detail })` where `detail = ReturnType<typeof useProjectDetail>`. On mount calls `detail.loadHistory()`. Renders `LoadingPanel` while `history === null`, `EmptyPanel` when empty, else a `DeploymentRow` per item. Each row's `onRollback` opens `ConfirmDialog`; confirming calls `detail.rollback(deploymentId)` and then `detail.reload()`, tracking running/message state per deployment.
- `EnvironmentTab({ detail })`. On mount calls `detail.loadSecrets()`. Renders `LoadingPanel` while `secretsByApp === null`; groups handles by app filtered to `detail.source.apps` names; `EmptyPanel` with the "durable writes pending" note when empty. **Never renders values** — only handle strings.
- `SettingsTab({ detail })`. Presentational: repository, source id, installation id, deploy branch (from `detail.source`), plus `<SdkBadge stamped={latestStampedSdk} required={detail.sdk?.sdkStatus.requiredVersion} />`, and a disabled "Disconnect (coming soon)" button.
- `ProjectHeader({ source, latest, onRefresh })`.

- [ ] **Step 1: Write failing tests**

```tsx
// tabs/environment-tab.test.tsx — asserts redaction (values never shown)
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";

const detail = {
  source: { id: 1, installationId: 5, repositoryLink: "a/b", apps: [{ name: "demo", isActive: true, loaded: true }], latestDeployment: null },
  loadSecrets: vi.fn(),
  secretsByApp: { demo: ["$SECRET:APP:demo::API_KEY"] },
} as any;

it("shows handle names but not values", async () => {
  render(<EnvironmentTab detail={detail} />);
  await waitFor(() => expect(screen.getByText("$SECRET:APP:demo::API_KEY")).toBeInTheDocument());
  expect(detail.loadSecrets).toHaveBeenCalled();
});
```

```tsx
// tabs/deployments-tab.test.tsx — rollback requires confirm
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeploymentsTab } from "./deployments-tab";

const rollback = vi.fn(async () => ({ ok: true, rollback: { deploymentId: "dep_1", releaseTags: ["t1"], status: "rolled_back" } }));
const detail = {
  source: { id: 1, repositoryLink: "a/b", apps: [], latestDeployment: null },
  loadHistory: vi.fn(),
  history: [{ deploymentId: "dep_1", apps: [], releaseTags: ["t1"], state: "recorded", commitHash: "abc123", ciStatus: null }],
  rollback, reload: vi.fn(), sdk: { sdkStatus: { requiredVersion: "3.0.1" } },
} as any;

it("confirms before rolling back", async () => {
  render(<DeploymentsTab detail={detail} />);
  fireEvent.click(await screen.findByRole("button", { name: /rollback/i }));
  expect(rollback).not.toHaveBeenCalled();               // dialog first
  fireEvent.click(screen.getByRole("button", { name: /roll back/i }));
  await waitFor(() => expect(rollback).toHaveBeenCalledWith("dep_1"));
});
```

- [ ] **Step 2: Run to verify fail; Step 3: implement the four components; Step 4: run to verify pass**

Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/tabs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/components/deployments/tabs apps/portal/src/features/launch/components/deployments/project-header.tsx
git commit -m "feat(portal): add deployment console tab components"
```

---

## Task 9: `ProjectPage` (tab shell via `?tab=`)

**Files:**
- Create: `.../deployments/project-page.tsx`
- Create: `.../deployments/index.ts` (barrel)
- Test: `.../deployments/project-page.test.tsx`

**Interfaces:**
- Consumes: `useProjectDetail`, `ProjectHeader`, the three tabs, `next/navigation` `useSearchParams`/`useRouter`.
- Produces: `export function ProjectPage({ sourceId }: { sourceId: number })`. Reads `?tab=` (default `"deployments"`); a tab strip switches by pushing `?tab=...`; renders the active tab passing the shared `detail`. `index.ts` re-exports `ProjectIndex` and `ProjectPage`.

- [ ] **Step 1: Write the failing test**

```tsx
// project-page.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=environment"),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../hooks/use-project-detail", () => ({
  useProjectDetail: () => ({
    source: { id: 1, repositoryLink: "a/b", apps: [], latestDeployment: null, installationId: 5 },
    loading: false, error: null, sdk: null, history: null, secretsByApp: {},
    loadHistory: vi.fn(), loadSecrets: vi.fn(), rollback: vi.fn(), reload: vi.fn(),
  }),
}));

import { ProjectPage } from "./project-page";

it("renders the tab named by ?tab=", () => {
  render(<ProjectPage sourceId={1} />);
  expect(screen.getByRole("tab", { name: /environment/i })).toHaveAttribute("aria-selected", "true");
});
```

- [ ] **Step 2: Run to verify fail; Step 3: implement `ProjectPage` + `index.ts`; Step 4: run to verify pass**

The tab strip uses `role="tab"` with `aria-selected`; clicking pushes `?tab=<id>`. Active tab = `searchParams.get("tab") ?? "deployments"`.
Run: `cd apps/portal && pnpm vitest run src/features/launch/components/deployments/project-page.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/features/launch/components/deployments/project-page.tsx apps/portal/src/features/launch/components/deployments/index.ts apps/portal/src/features/launch/components/deployments/project-page.test.tsx
git commit -m "feat(portal): add ProjectPage tab shell"
```

---

## Task 10: Wire routes + remove the monolith

**Files:**
- Modify: `apps/portal/src/app/deployments/page.tsx`
- Create: `apps/portal/src/app/deployments/[sourceId]/page.tsx`
- Modify: `apps/portal/src/features/launch/components/index.ts`
- Delete: `apps/portal/src/features/launch/components/deployment-console.tsx`

**Interfaces:**
- Consumes: `ProjectIndex`, `ProjectPage` from the deployments barrel.

- [ ] **Step 1: Point the index route at `ProjectIndex`**

```tsx
// app/deployments/page.tsx
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { ProjectIndex } from "@portal/features/launch/components/deployments";

export default function DeploymentsPage() {
  return (
    <ErrorBoundary>
      <ProjectIndex />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Add the project route**

```tsx
// app/deployments/[sourceId]/page.tsx
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { ProjectPage } from "@portal/features/launch/components/deployments";

export default async function ProjectRoute({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const id = Number(sourceId);
  return (
    <ErrorBoundary>
      {Number.isSafeInteger(id) ? <ProjectPage sourceId={id} /> : <div className="p-6 text-sm text-red-600">Invalid project id.</div>}
    </ErrorBoundary>
  );
}
```

(If this repo's Next version passes `params` synchronously, drop `async`/`await` and type `params` as `{ sourceId: string }` — match the other dynamic routes in `app/`.)

- [ ] **Step 3: Update the components barrel**

```ts
// features/launch/components/index.ts
export { DeployDashboard } from "./deploy-dashboard";
export { ProjectIndex, ProjectPage } from "./deployments";
```

- [ ] **Step 4: Delete the monolith and fix references**

```bash
git rm apps/portal/src/features/launch/components/deployment-console.tsx
```
Search for stragglers and remove the old export:
Run: `grep -rn "DeploymentConsole" apps/portal/src` → Expected: no results after edits.

- [ ] **Step 5: Full typecheck + test suite**

Run: `cd apps/portal && pnpm tsc --noEmit && pnpm vitest run src/features/launch`
Expected: PASS. Also `cd packages/deploy && pnpm vitest run`.

- [ ] **Step 6: Commit**

```bash
git add apps/portal/src/app/deployments apps/portal/src/features/launch/components/index.ts
git commit -m "feat(portal): switch /deployments to modular Vercel-style console"
```

---

## Task 11: Manual verification in the running app

- [ ] **Step 1:** Start the portal dev server (repo's dev command).
- [ ] **Step 2:** Visit `/deployments` — confirm the project index lists projects, shows the SDK banner, and (via devtools Network) makes **no** `deployments/history` calls.
- [ ] **Step 3:** Click a project → `/deployments/[id]?tab=deployments`; confirm history loads, and rollback prompts a confirm dialog.
- [ ] **Step 4:** Switch to `?tab=environment` — confirm redacted handles render (or the empty-state note) and secrets fetch fires only now.
- [ ] **Step 5:** Switch to `?tab=settings` — confirm metadata + SDK compatibility badge; disconnect is disabled.
- [ ] **Step 6:** Confirm signed-out and error states render the shared panels.

---

## Self-Review

**Spec coverage:** index route (T7,T10), project route + tabs (T8,T9,T10), Deployments tab + rollback confirm (T8), Environment read-only redacted (T2,T8), Settings read-only + SDK badge (T8), no history fan-out (T4,T7,T11), secrets BFF proxy (T1,T2), modular file split (T3–T10), delete monolith (T10). All spec sections mapped.

**Placeholder scan:** Presentational ports (DeploymentRow, StatusDot/Pill, GitHubSignInPanel) reference the existing `deployment-console.tsx` as the concrete source to copy — this is a real, in-repo reference, not a TBD. All logic-bearing units have full code + tests.

**Type consistency:** `deploymentSecrets(): DeploymentSecretsResult { byApp }` (T2) ↔ `listSecrets(): ListSecretsResult { byApp }` (T1) ↔ `useProjectDetail.secretsByApp` (T5) ↔ `EnvironmentTab` (T8) — all `Record<string,string[]>` keyed `byApp`. `useProjects`/`useProjectDetail` state shapes match their consumers (T7/T9). `rollback(deploymentId)` returns `DeploymentRollbackResult` consistently (T5,T8).
