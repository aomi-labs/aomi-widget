---
title: BFF Endpoints
owner: frontend
status: authoritative
area: bff
review_after_days: 30
sources_of_truth:
  - apps/portal/src/app/api
  - apps/portal/src/lib/onboard-deploy.ts
---

# BFF Endpoints

The portal BFF routes live under `apps/portal/src/app/api`. They translate browser-facing portal calls into backend requests.

## Endpoint Table

| FE BFF endpoint                    | Who calls it                                                | Where it gets to, if any                                                                                                                         | What it does                                                                                                                            | Code path                                                 |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `POST /api/launch/create`          | Portal onboarding create-source step                        | Rust backend `POST /api/integrations/github-app/platforms/:platform/sources/create-from-template`                                                | Creates a GitHub repo from the configured template and records the returned app source details.                                         | `apps/portal/src/app/api/launch/create/route.ts`          |
| `POST /api/launch/sync-installed`  | Portal onboarding path for an already-installed GitHub repo | Rust backend `POST /api/platforms/:platform/sources/sync-installed`                                                                              | Syncs a GitHub installation/repo pair into a backend app source record and returns source metadata.                                     | `apps/portal/src/app/api/launch/sync-installed/route.ts`  |
| `POST /api/launch/preflight`       | Portal onboarding deploy preview step                       | Rust backend `POST /api/platforms/:platform/sources/sync-installed` when needed, then `POST /api/platforms/:platform/deploy` with `preflight: true` | Uses a cached app source id or syncs the repo, then asks the backend to preview a deployment without committing/activating it.          | `apps/portal/src/app/api/launch/preflight/route.ts`       |
| `POST /api/launch/deploy`          | Portal onboarding deploy step                               | Rust backend `POST /api/platforms/:platform/deploy` without `preflight`                                                                         | Starts the backend deployment flow for an already-resolved app source id, returning deployment id, apps, and release tags.              | `apps/portal/src/app/api/launch/deploy/route.ts`          |
| `GET /api/launch/status`           | Portal onboarding status polling                            | Rust backend `GET /api/platforms/:platform/deployments/:deployment/status`                                                                       | Polls deployment status and reports backend or CI failures directly.                                                                    | `apps/portal/src/app/api/launch/status/route.ts`          |
| `POST /api/launch/activate`        | Portal onboarding activation step                           | Rust backend `POST /api/platforms/:platform/apps/activate`                                                                                       | Activates one or more release tags on the configured platform, optionally with target tags.                                             | `apps/portal/src/app/api/launch/activate/route.ts`        |
| `GET /api/launch/app`              | Portal onboarding live-app status polling                   | Rust backend `GET /api/platforms/:platform/apps/:name` with optional `release_tag`                                                               | Checks whether a platform app is active and loaded for the requested release.                                                           | `apps/portal/src/app/api/launch/app/route.ts`             |

## Operational Notes

- `/api/launch/*` is the current portal onboarding flow and uses `apps/portal/src/server/bff/launch/routes.ts` for backend authorization and request helpers.
- Onboarding backend calls use the portal's service identity: `aomi-bff` mints a short-lived `service` bearer with `PORTAL_SERVICE_PRIVATE_KEY`. The committed service-topology TOML is selected automatically from the backend target / Vercel environment.
- The portal onboarding BFF does not use `AOMI_ADMIN_SECRET` or `APP_DEPLOY_ACTIVATION_TOKEN`. Activation tokens remain the CLI/update-path credential, not the browser onboarding credential.
- Onboarding product choices are code constants: platform `community`, template repo `aomi-labs/playground-example`, source branch `main`, manifest path `aomi.toml`, public created repos, and no activation `target_tags`.
- Backend-owned Privy auth uses the non-API page route `/auth/privy`; the browser callback posts to the backend callback URL returned by `POST /api/auth/privy/begin`.
