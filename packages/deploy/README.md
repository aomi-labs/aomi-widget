# @aomi-labs/deploy

Server-side TypeScript client to the Aomi **deployment platform** — the
privileged engine of the ADR 0011 deploy-proxy. It performs the two credentialed
operations a browser cannot:

1. **deploy** — commit `apps/<slug>/` to the publish branch via the GitHub Git
   Data API (reproduces the `aomi-git deploy` contract, no git binary), writing
   a contract-valid `.aomi/deployment.json` that the publish CI reads.
2. **activate** — call the backend `POST /api/admin/apps/activate` with the
   platform-wide activation token + the transient read PAT.

Plus **status** polling to bridge the CI build gap.

> ⚠️ **Node-only. Never bundle into a browser.** This package holds the bot PAT
> and the platform activation token. The constructor throws
> `BrowserEnvironmentError` if it detects a browser. Import it only from a
> server route handler / serverless function.

## What this package does NOT do

Per ADR 0011, **all per-user isolation and attribution live in your proxy**:

- **Ownership** — resolving "does this session own `<slug>`?" is the caller's job
  (it depends on your own user records). Call `deploy`/`activate` only after you
  have authorized the caller.
- **Audit persistence** — pass an `onAudit` hook; this package calls it on every
  privileged op, but you must persist the record. It is the only place
  per-user attribution exists.

This package enforces the **platform contract**: per-slug path scoping,
narrow-only `target_tags`, and the exact `deployment.json` shape CI validates.

## Usage

```ts
import { DeploymentClient } from "@aomi-labs/deploy";

const dc = new DeploymentClient({
  github: { repo: "aomi-labs/krexa-hosted-apps", branch: "publish", botPat: process.env.BOT_PAT! },
  aomi:   { backendUrl: process.env.AOMI_BACKEND_URL!, platform: "krexa", activationToken: process.env.KREXA_ACTIVATION_TOKEN! },
  onAudit: (e) => auditLog.write(e), // YOU persist this (attribution)
});

// in POST /api/deploy — AFTER your own ownershipCheck(session, slug):
const { releaseTag, sourceCommit, serverTags } = await dc.deploy({
  slug, displayName, files, serverTags: ["staging"], actor: session.userId,
});

// poll until CI publishes the release:
const { ci, release } = await dc.getStatus(slug);

// in POST /api/activate — once release === "ready":
await dc.activate({ slug, targetEnv: "staging", releaseTag, sourceCommit, buildServerTags: serverTags, actor: session.userId });
```

### One-click flow (deploy → build → activate)

"One click = live" is an async pipeline, **not** one call — CI takes minutes and
the release tag does not exist when the push returns. Model it as a progress UI
(deploy → building → activating → live). **Never auto-activate at push** (CI-race
502). `deploy()` and `activate()` are intentionally separate methods.

### Promote to prod

`target_tags` is narrow-only — it must be a subset of the build's `server_tags`.
You cannot promote a staging build to prod; re-`deploy` with `prod` in
`serverTags`, then `activate` prod. Pass the build's `serverTags` as
`buildServerTags` to get a local `TagWideningError` before the backend call.

## Contract pinning

The generated `deployment.json` is pinned to ADR 0004 / `platform.json` /
`publish_app.py`. `test/contract-drift.test.ts` re-implements the CI validator
independently and runs it against a generated manifest — if upstream changes,
that test fails. Keep the descriptor constants in sync with `platform.json`.
