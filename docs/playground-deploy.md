# Portal Deploy Flow

The portal deploy tab is a server-side proxy over the Aomi platform deploy API.
The browser never receives deployment secrets; it only calls the portal's own
`/api/deploy/*` routes.

The current flow is backend-owned:

- `POST /api/deploy/dry-run` calls backend deploy with `dry_run: true`.
- `POST /api/deploy` calls backend deploy with `dry_run: false`.
- `GET /api/deploy/status?slug=...&releaseTag=...` retries backend activation
  until the release tag can be fetched, installed, and loaded by the runtime.
- `POST /api/deploy/activate` directly activates a returned release tag.

The backend owns GitHub App source reads, target platform repo writes, branch/PR
creation, release-tag derivation, and runtime activation.

## Server Env

Set these on the portal server before running deploy routes:

```sh
APP_DEPLOY_ACTIVATION_TOKEN=...
APP_DEPLOY_APP_SOURCE_ID=...
APP_DEPLOY_PLATFORM=community
APP_DEPLOY_SOURCE_BRANCH=main
APP_DEPLOY_AOMI_TOML_PATHS=aomi.toml
NEXT_PUBLIC_BACKEND_URL=https://staging-api.aomi.dev
```

For the demo bot source, use the connected source row for:

```text
https://github.com/CeciliaZ030/my-aomi-bots
```

The local checkout lives at:

```text
/Users/cecilia/Code/my-aomi-bots
```

## Demo Bot Config

The demo bot must keep its app name consistent between `aomi.toml` and the Rust
plugin macro:

```toml
[app]
name = "cecilia-test-2"
display_name = "Cecilia Test 2"
platform = "community"
```

```rust
dyn_aomi_app!(
    app = client::HyperliquidApp,
    name = "cecilia-test-2",
    ...
);
```

CLI clients should keep a local `.aomi/deployment.json` as their source-repo
deployment state. Deploy writes the backend deploy response into that file, and
activation folds the backend activation response back into it. The backend still
computes the deploy plan from the connected GitHub source row, source ref, and
`aomi.toml` paths.

## BE <> Portal Route E2E

Start the portal with the server env above:

```sh
pnpm --filter portal dev
```

Dry run:

```sh
curl -sS -X POST http://localhost:3000/api/deploy/dry-run \
  -H 'content-type: application/json' \
  -d '{"name":"ignored-for-contract"}'
```

Expected shape:

```json
{
  "source": { "repo": "CeciliaZ030/my-aomi-bots", "url": "..." },
  "slug": "cecilia-test-2",
  "targetRepo": "aomi-labs/community-apps",
  "files": [{ "path": "apps/<installation-id>/<app>", "bytes": 0 }],
  "deployment": {
    "id": "...",
    "status": "dry_run",
    "source": { "...": "..." },
    "platform": {
      "platform": "community",
      "repository": "aomi-labs/community-apps",
      "deployBranch": "main",
      "sourceBranch": "<owner>/<repo>/<installation-id>/<short-commit>",
      "apps": [
        {
          "name": "cecilia-test-2",
          "path": "apps/<installation-id>/cecilia-test-2",
          "aomiTomlPath": "aomi.toml",
          "releaseTag": "apps-<installation-id>-cecilia-test-2-<short-commit>"
        }
      ]
    }
  }
}
```

Deploy:

```sh
curl -sS -X POST http://localhost:3000/api/deploy \
  -H 'content-type: application/json' \
  -d '{"name":"ignored-for-contract","actor":"e2e"}'
```

Expected shape is the package `DeployResult` directly:

```json
{
  "ok": true,
  "deployment": {
    "status": "pr_created",
    "platform": {
      "prUrl": "...",
      "ciStatus": "pending",
      "ciUrl": "...",
      "apps": [{ "releaseTag": "apps-..." }]
    }
  }
}
```

Activate with the returned app release tag:

```sh
curl -sS -X POST http://localhost:3000/api/deploy/activate \
  -H 'content-type: application/json' \
  -d '{"slug":"cecilia-test-2","releaseTag":"apps-<installation-id>-cecilia-test-2-<short-commit>","actor":"e2e"}'
```

A successful activation proves the deploy did more than write DB/platform repo
state: the app release is addressable by the runtime and loaded.
