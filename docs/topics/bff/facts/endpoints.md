---
title: BFF Endpoints
owner: frontend
status: authoritative
area: bff
review_after_days: 30
sources_of_truth:
  - apps/portal/src/app/api
  - apps/portal/src/server/bff/launch/routes.ts
  - apps/portal/src/server/bff/launch/config.ts
---

# BFF Endpoints

The portal BFF routes live under `apps/portal/src/app/api`. They translate browser-facing portal calls into backend requests.

## Endpoint Table

| FE BFF endpoint                   | Who calls it                                                      | Where it gets to, if any                                                                                                                                  | What it does                                                                                                                                                    | Code path                                                |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `GET /api/launch/sources`         | GitHub-signed-in deploy dashboard                                 | Rust backend `GET /api/integrations/github-app/user/sources?github_user_id&platform`                                                                      | Returns only launch-relevant source cards for the configured platform. Broad GitHub App installations do not become dashboard cards by default.                 | `apps/portal/src/app/api/launch/sources/route.ts`        |
| `POST /api/launch/create`         | One-click create-source step                                      | Rust backend `POST /api/integrations/github-app/platforms/:platform/sources/create-from-template`                                                         | Creates a GitHub repo from the configured template and records the returned app source details.                                                                 | `apps/portal/src/app/api/launch/create/route.ts`         |
| `POST /api/launch/sync-installed` | Manual Fork & Customize path for an already-installed GitHub repo | Rust backend `POST /api/platforms/:platform/sources/sync-installed`                                                                                       | Syncs exactly the pasted `owner/repo` into a backend app source record and passes the signed-in `github_user_id` so backend can bind ownership.                 | `apps/portal/src/app/api/launch/sync-installed/route.ts` |
| `POST /api/launch/preflight`      | Launch deploy preview step                                        | Rust backend `POST /api/platforms/:platform/sources/sync-installed` when needed, then `POST /api/platforms/:platform/deploy` with `preflight: true`       | Uses a cached app source id or syncs the repo with the signed-in `github_user_id`, then asks the backend to validate/preview without writing the platform repo. | `apps/portal/src/app/api/launch/preflight/route.ts`      |
| `POST /api/launch/deploy`         | Launch deploy step                                                | Rust backend `POST /api/platforms/:platform/deploy` with `preflight: false`                                                                               | Starts the backend deployment flow from a known `appSourceId`, returning deployment id, apps, and release tags.                                                 | `apps/portal/src/app/api/launch/deploy/route.ts`         |
| `GET /api/launch/status`          | Launch status polling                                             | Rust backend `GET /api/platforms/:platform/deployments/:deployment/status`                                                                                | Polls deployment status and enriches pending CI status from GitHub Actions when needed.                                                                         | `apps/portal/src/app/api/launch/status/route.ts`         |
| `POST /api/launch/activate`       | Launch activation step                                            | Rust backend `POST /api/platforms/:platform/apps/activate`                                                                                                | Activates one or more release tags on the configured platform, optionally with target tags.                                                                     | `apps/portal/src/app/api/launch/activate/route.ts`       |
| `GET /api/launch/app`             | Launch live-app status polling                                    | Rust backend `GET /api/platforms/:platform/apps/:name` with optional `release_tag`                                                                        | Checks whether a platform app is active and loaded for the requested release.                                                                                   | `apps/portal/src/app/api/launch/app/route.ts`            |
| `POST /api/launch/redeploy`       | Existing source card redeploy action                              | Rust backend `GET /api/integrations/github-app/user/sources/:id/latest-deployment`, then GitHub `POST /repos/{platformRepo}/actions/runs/{ciRunId}/rerun` | Hydrates only the target source's backend-owned CI run and reruns it. Requires `GITHUB_TOKEN`; returns `409` when no CI run is available.                       | `apps/portal/src/app/api/launch/redeploy/route.ts`       |

## Operational Notes

- `/api/launch/*` is the current portal launch flow and uses `apps/portal/src/server/bff/launch/routes.ts` for backend authorization and request helpers.
- Onboarding backend calls use the portal's service identity: `aomi-bff` mints a short-lived `service` bearer with `PORTAL_SERVICE_PRIVATE_KEY`. The committed service-topology TOML is selected automatically from the backend target / Vercel environment.
- The portal onboarding BFF does not use `AOMI_ADMIN_SECRET` or `APP_DEPLOY_ACTIVATION_TOKEN`. Activation tokens remain the CLI/update-path credential, not the browser onboarding credential.
- Launch product choices are env-driven server-side config: `APP_DEPLOY_PLATFORMS` (default `community`, JSON array or comma-separated), `APP_DEPLOY_AOMI_TOML_PATHS` (default `aomi.toml`, comma-separated), and optional `APP_DEPLOY_TARGET_TAGS` (comma-separated); the first configured platform is the primary deploy target, while app pickers may merge every configured platform. GitHub install redirects receive the primary platform server-side; the client does not need a public platform env. The deploy source ref is an immutable commit SHA from `APP_DEPLOY_SOURCE_REF` (or `APP_DEPLOY_SOURCE_COMMIT`).
- Chat links use `NEXT_PUBLIC_CHAT_URL`, defaulting to `https://chat.aomi.dev`.
- Redeploy requires a portal-side `GITHUB_TOKEN` because it calls GitHub's workflow-run rerun endpoint directly.
- Backend-owned Privy auth uses the non-API page route `/auth/privy`; the browser callback posts to the backend callback URL returned by `POST /api/auth/privy/begin`.
