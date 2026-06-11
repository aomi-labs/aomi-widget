# @aomi-labs/deploy

Server-side TypeScript client for the Aomi platform deploy API.

It is intentionally a thin backend relay:

- `deploy()` calls `POST /api/platforms/:platform/deploy` with `app_source_id`,
  `source_ref`, `aomi_toml_paths`, and optional `dry_run`.
- `activate()` calls `POST /api/platforms/:platform/apps/activate` with one
  `release_tags` target. App names may be omitted because the backend derives
  them from the tags.
- The backend owns GitHub App source reads, platform repo writes, PR/CI checks,
  release-tag derivation, and runtime activation.

Browser code must not import this package because it holds the activation
bearer. Import it only from a server route handler or BFF.

```ts
import { DeploymentClient } from "@aomi-labs/deploy";

const dc = new DeploymentClient({
  aomi: {
    backendUrl: process.env.AOMI_BACKEND_URL!,
    activationToken: process.env.AOMI_APP_ACTIVATION_TOKEN!,
  },
});

const deploy = await dc.deploy({
  platform: "community",
  appSourceId: 42,
  sourceRef: { kind: "branch", value: "main" },
  aomiTomlPaths: ["aomi.toml"],
  dryRun: true,
});

await dc.activate({
  platform: "community",
  target: {
    kind: "release_tags",
    value: deploy.deployment.platform.apps.map((app) => app.releaseTag),
  },
  apps: deploy.deployment.platform.apps.map((app) => app.name),
  targetTags: ["staging"],
});
```
