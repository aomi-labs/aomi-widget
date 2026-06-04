# Portal "Deploy" tab — playground deploy flow

The **Settings → Deploy** tab lets a visitor name an app (e.g. `alice-app-123`),
preview it, deploy it to the sandbox platform repo, and activate it — **no code,
no CLI, no tokens in the browser**.

## Architecture (who holds what)

- **Browser** (`apps/portal/src/components/settings/deploy-settings.tsx`) — the UI.
  Holds no secrets; only calls the portal's own `/api/deploy/*` routes.
- **Portal server routes** (`apps/portal/src/app/api/deploy/*`) — the
  **deploy-proxy** (ADR 0011). Holds the secrets, does the privileged work over
  HTTP. Wraps `@aomi-labs/deploy` (`apps/portal/src/lib/deploy.ts`).
- **GitHub API** — source of the starter app + the publish target.
- **Aomi backend** — activates the built release.

Everything is HTTP — **no git binary, no local clone, no filesystem** — so it
runs unchanged on Vercel/serverless.

### Config

Server env in the portal (never `NEXT_PUBLIC_*`); everything else is hard-coded
in `src/lib/deploy.ts`:

| env | required for | note |
|---|---|---|
| `APP_DEPLOY_BOT_PAT` | deploy + status | fine-grained PAT, Contents R/W on `aomi-labs/aomi-playground` (secret) |
| `APP_DEPLOY_ACTIVATION_TOKEN` | activate only | platform-wide `playground` activation token (secret) |
| `APP_DEPLOY_DISCORD_WEBHOOK` | optional | webhook for the "Publish your own app" request. Unset → request is built but not auto-posted. (secret — this repo is public, so it must stay in env) |

Hard-coded: target repo `aomi-labs/aomi-playground`, platform `playground`,
starter `aomi-labs/aomi-app-example` (`app/` subdir), the ops role mention.
Backend URL reuses the portal's existing `NEXT_PUBLIC_BACKEND_URL`.

---

## Dry run — `POST /api/deploy/dry-run`

Read-only preview. Reads the starter from GitHub, computes the plan in-memory,
and returns the exact `.aomi/deployment.json` that a real deploy would publish.
**No push, no commit, no backend call.**

```mermaid
sequenceDiagram
    actor Alice
    participant UI as Deploy tab (browser)
    participant API as Portal /api/deploy/dry-run<br/>(Next.js server route)
    participant GH as GitHub API<br/>(api.github.com)

    Alice->>UI: type "alice-app-123", click "Dry run"
    UI->>API: POST /api/deploy/dry-run { name: "alice-app-123" }

    Note over API: readDeployEnv()<br/>APP_DEPLOY_BOT_PAT, target=aomi-labs/aomi-playground,<br/>platform=playground
    API->>API: appSlug("alice-app-123") → "alice-app-123"<br/>(400 if empty)

    Note over API,GH: fetchExampleBundle() — read the starter (bot PAT)
    API->>GH: GET /repos/aomi-labs/aomi-app-example/git/trees/HEAD?recursive=1
    GH-->>API: tree (app/Cargo.toml, app/src/*, app/aomi.toml, …)
    loop each blob under app/
        API->>GH: GET /repos/aomi-labs/aomi-app-example/git/blobs/{sha}
        GH-->>API: base64 file content
    end
    Note over API: rewrite aomi.toml →<br/>name="alice-app-123", platform="playground",<br/>git=…/aomi-playground

    Note over API: build the plan in-memory (no I/O)
    API->>API: stageFiles() → [{path, sha256, bytes}] (sorted)
    API->>API: deriveSourceCommit() → e315cae47d53… (content hash)
    API->>API: buildDeploymentManifest(targetDescriptor) → .aomi/deployment.json

    Note over API: ⛔ no commit, no release, no activate
    API-->>UI: 200 { slug, releaseTag: apps-alice-app-123-e315cae47d53,<br/>appPath: apps/alice-app-123, files[], manifest }
    UI->>Alice: render deployment.json + summary
```

**Notes**

- The bot PAT is used only to *read* the public starter (avoids rate limits);
  nothing is written.
- The release tag is **deterministic** from bundle contents
  (`apps-<slug>-<contenthash>`), so the dry-run shows the exact tag a real deploy
  produces.
- `stageFiles` / `deriveSourceCommit` / `buildDeploymentManifest` run in-process
  (uses `node:crypto`); no git, no disk.

---

## Deploy + activate — the write path

`Deploy` does what dry-run does, then writes to GitHub, waits for CI, and
activates. The UI shows a GitHub-checks-style stepper driven by polling
`/api/deploy/status`.

```mermaid
sequenceDiagram
    actor Alice
    participant UI as Deploy tab (browser)
    participant API as Portal /api/deploy/*
    participant GH as GitHub (Git Data API + Actions/Releases)
    participant CI as Playground CI (publish-apps.yml)
    participant BE as Aomi backend

    Alice->>UI: click "Deploy"
    UI->>API: POST /api/deploy { name }
    Note over API: fetchExampleBundle() + client.deploy()
    API->>GH: Git Data API — blobs → tree → commit → update ref (publish)
    GH-->>API: publish commit sha
    API-->>UI: 202 { releaseTag, sourceCommit, ciUrl }
    GH->>CI: push to publish triggers CI
    CI->>CI: build cdylib + cut release apps-alice-app-123-<commit>

    loop poll until release ready (exact tag)
        UI->>API: GET /api/deploy/status?slug=alice-app-123
        API->>GH: list workflow runs + releases
        GH-->>API: ci/release state
        API-->>UI: { ci, release, releaseTag }
    end

    Note over UI: release.ready && releaseTag === ours
    UI->>API: POST /api/deploy/activate { slug, releaseTag, sourceCommit }
    API->>BE: POST /api/admin/apps/activate (Bearer activation token + read PAT)
    BE->>GH: fetch release tarball
    BE->>BE: validate (SDK/target/checksum) → install → load plugin
    BE-->>API: 200 activated  (or 422 incompatible / 502 fetch-install)
    API-->>UI: result
    UI->>Alice: "App is live on staging" (or "Deploy blocked" + reason)
```

**Notes**

- The status poll activates only when the release's **exact** tag is ready — not
  a stale release that merely shares the `apps-<slug>-` prefix.
- Activation is gated on the backend; a documented **502** in the fetch/install
  step can block the final step (tracked separately). The UI surfaces the reason
  and offers a retry rather than hanging.
- After a live deploy the UI shows "customize it" steps: clone the starter, edit,
  then `aomi-git deploy && aomi-git activate` from the user's own machine
  (request contributor access first via "Publish your own app").
