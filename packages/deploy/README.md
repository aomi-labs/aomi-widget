# @aomi-labs/deploy

TypeScript toolkit for the Aomi platform deploy API, in three cleanly
separated layers:

| Entry | Runs in | What it is |
| --- | --- | --- |
| `@aomi-labs/deploy` | server only | `DeploymentClient` — typed HTTP client holding the activation/service bearer |
| `@aomi-labs/deploy/bff` | server only | Drop-in BFF route factories: the one-shot launch flow + "Sign in with GitHub" |
| `@aomi-labs/deploy/launch` | browser | Typed client for the BFF routes, wizard state machine, contracts |
| `@aomi-labs/deploy/lifecycle` | browser | Pure helpers projecting deploy records into dashboard state |

**There is no UI component to install.** The deploy UI is a fast-churn page,
not a stable primitive, so it is not published as a package you vendor — build
the UI your product needs on top of the `@aomi-labs/deploy/launch` client, in
your own stack. Aomi's own portal builds this flow in React against the same
client (`apps/portal/src/features/launch/` in the `aomi-widget` repo) — read it
as a worked example, don't copy it in.

**Integrating from a coding agent?** This package ships an agent-oriented
integration skill at [`skills/aomi-deploy/SKILL.md`](skills/aomi-deploy/SKILL.md).
Point Claude Code / Cursor at it (after `npm install`, it's in
`node_modules/@aomi-labs/deploy/skills/`) to wire the BFF routes, browser
client, and a bespoke deploy UI without reading the whole README.

## Drop-in one-shot launch (the partner path)

Give your users "deploy an agent" without building any of the flow yourself.
Three steps:

### 1. Mount the BFF routes (server)

```ts
// lib/launch.ts (server-only module)
import {
  createLaunchRoutes,
  createGitHubAuthRoutes,
  createGitHubSessionCodec,
} from "@aomi-labs/deploy/bff";
import { DeploymentClient } from "@aomi-labs/deploy";

const client = () =>
  new DeploymentClient({
    aomi: {
      backendUrl: process.env.AOMI_BACKEND_URL!,
      activationToken: process.env.AOMI_ACTIVATION_TOKEN!, // stays server-side
    },
  });

const session = createGitHubSessionCodec({
  secret: process.env.LAUNCH_SESSION_SECRET!, // any >= 16-char secret you hold
});

export const launch = createLaunchRoutes({
  client,
  session: (req) => session.fromRequest(req),
});

export const githubAuth = createGitHubAuthRoutes({
  client,
  session,
  callbackPath: "/api/bff/auth/github/callback",
  returnTo: "/deploy", // your page
});
```

Every handler is a plain `(Request) => Promise<Response>`, so Next.js App
Router mounts are one-liners (any fetch-style server works the same):

```ts
// app/api/bff/launch/deploy/route.ts
import { launch } from "@/lib/launch";
export const POST = launch.deploy;

// app/api/bff/auth/github/login/route.ts
import { githubAuth } from "@/lib/launch";
export const GET = githubAuth.login;
```

Mount the full set: `launch.{preflight,deploy,create,activate,redeploy}` as
`POST`, `launch.{status,app,sources}` as `GET`, and
`githubAuth.{login,callback,status}` as `GET` + `githubAuth.signout` as `POST`
under `/api/bff/auth/github/*`.

Defaults you can override: rate limiting + same-origin CSRF guards
(`guards`), `APP_DEPLOY_*` env config (`config`), CI enrichment/rerun token
(`githubToken`, default `process.env.GITHUB_TOKEN`).

### 2. Build the UI (browser, your stack)

Point a `createLaunchClient` at the routes and drive them. The whole happy
path is: `fetchGitHubSession` → `githubAppInstallUrl` → `createRepo` →
`deploy` → poll `status` → `activate` → `appStatus` → embed chat. Render it
however your product needs — often just a button, a status line, and a chat
embed.

```ts
"use client";
import { createLaunchClient } from "@aomi-labs/deploy/launch";

const launch = createLaunchClient(); // defaults to /api/bff/launch + /api/bff/auth/github
const { deployment } = await launch.deploy({ appSourceId, sourceRef });
// poll launch.status(deployment.id) until "ready", then launch.activate(...)
```

See the [`aomi-deploy` skill](skills/aomi-deploy/SKILL.md) for the full flow,
and Aomi's portal (`apps/portal/src/features/launch/`) for a worked React
example to read — not vendor.

### 3. Prerequisites from Aomi

- **Backend URL + activation token** for your platform (ask Aomi, or mint via
  the Bootstrap API below).
- **The Aomi GitHub App** does the repo scaffolding and deploy PRs; the OAuth
  client-id defaults built into the auth routes are Aomi's one-shot App, and
  the client secret stays in the Aomi backend. You don't register anything on
  GitHub.

The flow your users get: Sign in with GitHub → install the Aomi GitHub App →
one-click repo from the template → deploy → CI builds → activate → the live
agent appears in chat.

## Core API (`@aomi-labs/deploy`)

### `preflight()`

Calls `POST /api/platforms/:platform/deploy` with `app_source_id`, `source_ref`,
optional `aomi_toml_paths`, and `preflight: true`. Returns the deployment
record without opening or updating the platform PR. Use this to render
`deployment.json` before the user applies.

### `deploy()`

Calls `POST /api/platforms/:platform/deploy` with `app_source_id`, `source_ref`,
and optional `aomi_toml_paths`. This is the apply step: it writes the platform
deployment branch/PR when needed and starts the CI path.

`sourceRef` must be the immutable git commit SHA to deploy. Resolve branches or
tags before calling the client; the backend does not accept mutable refs.

`aomiTomlPaths` may be omitted to let the backend discover every `aomi.toml` in
the source commit.

### `activate()`

Calls `POST /api/platforms/:platform/apps/activate` with one `release_tags`
target. Returns an `ActivateResult` — check `result.ok` and inspect
`result.activation.apps` for per-app errors on partial failure.

### `status()`

Calls `GET /api/platforms/:platform/deployments/:id/status` (pass
`deploymentId`), or `GET /api/platforms/:platform/status` without one. The
status endpoint resolves CI against the **recorded built commit** (not the
live branch HEAD), preventing deployments from being orphaned by snapshot
merges.

### `watchDeployment(deploymentId, platform, onEvent, options?)`

Polls `status()` with exponential backoff (3s → 30s). It does **not** throw:
every tick calls `onEvent(event)` with a `DeploymentProgressEvent` —
`kind: "progress" | "terminal" | "warning" | "error"` — and the loop resolves
after a `terminal` or `error` event. Cancel via `options.signal`.

```ts
await dc.watchDeployment(id, "community", (event) => {
  render(event.progress); // { completed, total, label }
  if (event.kind === "terminal") console.log("done:", event.status.state);
  if (event.kind === "error") console.error(event.error);
});
```

## Bootstrap API

The steps **before** deploy — the twin of the Rust `aomi-build` bootstrap
commands. Each maps 1:1 onto a `/api/platforms/*` route.

| Method                           | Route                                                                          | Purpose                                                                |
| -------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `mintToken()`                    | `POST /:p/tokens`                                                              | mint a `platform` or `app` activation token (plaintext returned once)  |
| `listTokens()` / `revokeToken()` | `GET` / `DELETE /:p/tokens[/:id]`                                              | token lifecycle                                                         |
| `syncSource()`                   | `POST /:p/sources/sync-installed`                                              | resolve an installed repo → `appSourceId` for deploy                    |
| `scaffold()`                     | `POST /api/integrations/github-app/platforms/:p/sources/create-from-template`  | one-shot: create a repo from a template → source                        |
| `listApps()` / `getApp()`        | `GET /:p/apps[/:app]`                                                          | inventory loaded apps (find `app_id` for app-scoped tokens)             |
| `exchangeGitHubCode()`           | `GET /api/integrations/github-app/oauth/exchange`                              | GitHub OAuth code → identity (sign-in seam)                             |
| `listUserSources()`              | `GET /api/integrations/github-app/user/sources`                                | a GitHub user's connected source repos + their apps                     |

### Credential model

`mintToken()` is privileged: minting the **first** platform token needs an
admin/service AomiBearer, since no activation token exists yet. Configure it as
`aomi.adminBearer` (or pass `bearer` per call). All other calls use
`aomi.activationToken`. This package stays signing-free — mint the bearer with
`@aomi-labs/service` (workspace package; not yet published to npm — ask Aomi
for a token if you are integrating externally) and hand it in.

```ts
import { AomiService } from "@aomi-labs/service";
import { DeploymentClient } from "@aomi-labs/deploy";

// 1. Sign a short-lived admin bearer (holds the EdDSA private key).
const svc = AomiService.fromTopology({
  toml: process.env.AOMI_SERVICE_TOPOLOGY!,
  selfName: "aomi-admin",
  privateKeyPem: process.env.AOMI_ADMIN_KEY!,
});
const { accessToken: adminBearer } = await svc.mint({
  role: "admin",
  subject: "ops-admin",
  audience: "aomi-backend",
});

// 2. Mint a platform activation token with it.
const dc = new DeploymentClient({
  aomi: { backendUrl: process.env.AOMI_BACKEND_URL!, adminBearer },
});
const { token } = await dc.mintToken({
  platform: "playground",
  scope: "platform",
});

// 3. Resolve the source, then deploy with the minted token.
const client = new DeploymentClient({
  aomi: { backendUrl: process.env.AOMI_BACKEND_URL!, activationToken: token },
});
const { id } = await client.syncSource({
  platform: "playground",
  repo: "alice/alice-bot",
});
await client.deploy({
  platform: "playground",
  appSourceId: id,
  sourceRef: process.env.AOMI_SOURCE_REF!,
  aomiTomlPaths: ["aomi.toml"],
});
```

## Error handling

Every failure is a `DeployError` subclass; branch on `err.code`
(`"BROWSER_ENVIRONMENT" | "INVALID_REQUEST" | "BACKEND" | "ACTIVATION"`).
HTTP failures are `BackendError` (also a `DeployError`) carrying the status
and raw body:

```ts
import { BackendError, DeployError } from "@aomi-labs/deploy";

try {
  await dc.deploy({ ... });
} catch (e) {
  if (e instanceof BackendError) {
    console.error(e.status); // HTTP status (0 when the fetch itself failed)
    console.error(e.body);   // raw response body (string | undefined)
  } else if (e instanceof DeployError) {
    console.error(e.code);   // "INVALID_REQUEST" — rejected before any network call
  }
  console.error(e.message);
}
```

Activation rejections throw `DeployError` with `code: "ACTIVATION"` and the
per-app failures in `err.reason`; a successful call can still contain per-app
errors:

```ts
const result = await dc.activate({ ... });
if (!result.ok) {
  for (const app of result.activation?.apps ?? []) {
    if (app.error) console.error(`${app.name}: ${app.error}`);
  }
}
```

In BFF handlers, `launchErrorResponse(err)` (from `@aomi-labs/deploy/bff`)
maps any of these onto `{ error }` JSON with a faithful HTTP status.

## Types

The real input/output shapes live in `src/types.ts` and are all exported. The
ones you'll touch first:

```ts
interface DeployInput {
  platform: string;
  appSourceId: number;
  /** Immutable git commit SHA. Branch names are rejected by the backend. */
  sourceRef: string;
  aomiTomlPaths?: string[];
  actor?: string;
}

interface ActivateInput {
  platform: string;
  target: { kind: "release_tags"; value: string[] };
  apps?: string[];       // optional; backend can derive from release tags
  targetTags?: string[];
  actor?: string;
}

interface DeploymentStatus {
  state: "no_ci" | "building" | "releasing" | "ready" | "failed" | "pending";
  deployment?: DeployPayload;
  releaseTags: string[];
  apps?: DeploymentAppStatus[];
  ci?: { status?: string; url?: string; commitHash?: string };
  message?: string;
}
```

## Browser-safe lifecycle helpers

Portal/dashboard UI that only needs to project deploy records into display
state imports the pure helper subpath:

```ts
import {
  deploymentLifecycleFromSource,
  deploymentLifecycleFromStatus,
} from "@aomi-labs/deploy/lifecycle";
```

## Example

```ts
import { DeploymentClient } from "@aomi-labs/deploy";

const dc = new DeploymentClient({
  aomi: {
    backendUrl: process.env.AOMI_BACKEND_URL!,
    activationToken: process.env.AOMI_APP_ACTIVATION_TOKEN!,
  },
});

const preview = await dc.preflight({
  platform: "community",
  appSourceId: 42,
  sourceRef: process.env.AOMI_SOURCE_REF!,
});
console.log(JSON.stringify(preview.deployment, null, 2));

const { deployment } = await dc.deploy({
  platform: "community",
  appSourceId: 42,
  sourceRef: process.env.AOMI_SOURCE_REF!,
});

await dc.activate({
  platform: "community",
  target: {
    kind: "release_tags",
    value: deployment.platform.apps.map((app) => app.releaseTag),
  },
  apps: deployment.platform.apps.map((app) => app.name),
  targetTags: ["staging"],
});
```

## Tests

```
packages/deploy/test/
  client.test.ts               — deploy, activate, status, errors
  bootstrap.test.ts            — tokens, sources, scaffold, apps
  activation-request.test.ts   — request construction
  watch-deployment.pbt.test.ts — property-based backoff/timeout
  launch-routes.test.ts        — BFF factory: deploy/preflight/status/redeploy/sources
  launch-config.test.ts        — APP_DEPLOY_* env resolution
  github-auth.test.ts          — session codec + sign-in routes
  launch-state.test.ts         — wizard state machine
  launch-url-context.test.ts   — install-redirect matching
  dashboard-lifecycle.test.ts  — lifecycle projections
```

Run: `npx vitest run packages/deploy/`
