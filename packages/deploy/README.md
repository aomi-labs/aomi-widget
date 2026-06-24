# @aomi-labs/deploy

Server-side TypeScript client for the Aomi platform deploy API — **intended for
BFF / server use only** (holds the activation bearer token).

## API

### `deploy()`

Calls `POST /api/platforms/:platform/deploy` with `app_source_id`, `source_ref`,
`aomi_toml_paths`, and optional `preflight`.

### `activate()`

Calls `POST /api/platforms/:platform/apps/activate` with one `release_tags`
target. Returns an `ActivationResult` — check `result.ok` and inspect
`result.activation.apps` for per-app errors on partial failure.

### `deploymentStatus()`

Calls `GET /api/platforms/:platform/deployments/:id`. The status endpoint now
resolves CI against the **recorded built commit** (not the live branch HEAD),
preventing deployments from being orphaned by snapshot merges.

### `watchDeployment()`

Polls `deploymentStatus` with **exponential backoff** (3s → 30s base, max
~5 min total). Throws `DeployError` with `.reason` on timeout or terminal
failure. Best for CLI and automated workflows.

## Bootstrap API

The steps **before** deploy — the twin of the Rust `aomi-build` bootstrap
commands. Each maps 1:1 onto a `/api/platforms/*` route.

| Method                           | Route                                                                         | Purpose                                                               |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `mintToken()`                    | `POST /:p/tokens`                                                             | mint a `platform` or `app` activation token (plaintext returned once) |
| `listTokens()` / `revokeToken()` | `GET` / `DELETE /:p/tokens[/:id]`                                             | token lifecycle                                                       |
| `syncSource()`                   | `POST /:p/sources/sync-installed`                                             | resolve an installed repo → `appSourceId` for deploy                  |
| `scaffold()`                     | `POST /api/integrations/github-app/platforms/:p/sources/create-from-template` | one-shot: create a repo from a template → source                      |
| `listApps()` / `getApp()`        | `GET /:p/apps[/:app]`                                                         | inventory loaded apps (find `app_id` for app-scoped tokens)           |

### Credential model

`mintToken()` is privileged: minting the **first** platform token needs an
admin/service AomiBearer, since no activation token exists yet. Configure it as
`aomi.adminBearer` (or pass `bearer` per call). All other calls use
`aomi.activationToken`. Unlike the Rust CLI — which signs the admin bearer
itself — this package stays signing-free; mint the bearer with
[`@aomi-labs/service`](../service) and hand it in.

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
  sourceRef: { kind: "branch", value: "main" },
  aomiTomlPaths: ["aomi.toml"],
});
```

### Error handling

All client methods throw `DeployError` on non-2xx responses:

```ts
try {
  await dc.deploy({ ... });
} catch (e) {
  if (e instanceof DeployError) {
    console.error(e.reason);      // human-readable reason from the backend
    console.error(e.statusCode);  // HTTP status
    console.error(e.body);        // raw response body
  }
}
```

For activation, check partial failure:

```ts
const result = await dc.activate({ ... });
if (!result.ok) {
  for (const app of result.activation?.apps ?? []) {
    if (app.error) console.error(`${app.name}: ${app.error}`);
  }
}
```

## Types

```ts
interface DeployRequest {
  platform: string;
  appSourceId: number;
  sourceRef: { kind: "branch" | "commit"; value: string };
  aomiTomlPaths: string[];
  preflight?: boolean;
}

interface ActivateRequest {
  platform: string;
  target: { kind: "release_tags"; value: string[] };
  apps: string[];
  targetTags?: string[];
  actor?: string;
}

class DeployError extends Error {
  readonly reason: string;
  readonly statusCode: number | undefined;
  readonly body: unknown;
}

interface ActivationResult {
  ok: boolean;
  activation?: {
    id: string;
    apps: Array<{ name: string; loaded: boolean; error?: string }>;
  };
}
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

const { deployment } = await dc.deploy({
  platform: "community",
  appSourceId: 42,
  sourceRef: { kind: "branch", value: "main" },
  aomiTomlPaths: ["aomi.toml"],
  preflight: true,
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
  client.test.ts              — 9 tests (deploy, activate, status, errors)
  bootstrap.test.ts           — 11 tests (tokens, sources, scaffold, apps)
  activation-request.test.ts  — 8 tests (request construction)
  watch-deployment.pbt.test.ts — 6 property-based tests (backoff, timeout)
```

Run: `npx vitest run packages/deploy/test/`
