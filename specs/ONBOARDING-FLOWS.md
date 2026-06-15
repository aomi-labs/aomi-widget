# Onboarding Flows

The portal's onboarding lets users deploy an Aomi agent from the `playground-example`
template into their own GitHub account — no CLI, no manual config.

There are two entry paths visible on the picker screen (`/settings`, no path selected),
and a third "post-deploy" flow for accessing the live agent.

**Layout:** All file paths below are relative to `apps/portal/src/` unless noted.

---

## 1. One-click

**Picker label:** "One-click — We create the repo in your account and deploy it for you."

The shortest path. Grants a broad-scope GitHub App (`aomi-build-oneshot`) that can create
repos, open PRs, and write checks.

### Step diagram

```
Install → Create → Build → Live
```

### Step-by-step

#### 1a. Install `aomi-build-oneshot`

The user clicks "Install on GitHub" which calls `githubAppInstallUrl()` in
`lib/onboarding.ts:285`. The portal fetches an OAuth start URL from the backend
(`POST /api/integrations/github-app/oauth/start?app=2`), then redirects the browser
to GitHub's App install page.

The `pendingInstall` state is written to localStorage before the redirect so the
backend callback knows which wizard path to resume.

After the user completes the GitHub OAuth flow, the backend redirects back to
`/settings?installation_id=...&onboard=...&repo=...`. The `onboarding.tsx` component
parses these params via `readGithubRedirect()` and hydrates the progress.

A green banner ("GitHub App installed successfully") auto-dismisses after 6 seconds.

#### 1b. Create repo

The user clicks "Create repo" which calls `onboardCreateRepo()` →
`POST /api/onboard/create`. The backend forks `aomi-labs/playground-example` into
the account that owns the installation. The returned `repo` (owner/name) is stored
in progress.

#### 1c. Deploy

`DeployStep` (`components/settings/onboarding/deploy-step.tsx`) orchestrates a
state machine with these phases:

```
idle → dry_running → dry_ready → deploying → building → ready → activating → verifying → live
                                                                                  ↘ error
```

- **Dry run** — `POST /api/onboard/dry-run`. Renders the deployment manifest
  (source, build info, release tags) for preview.
- **Deploy** — `POST /api/onboard/deploy`. Kicks off platform CI. Returns a
  `deploymentId` which is persisted to the URL as `?deployment_id=<id>`.
- **Poll** — `GET /api/onboard/status?deploymentId=...` every 5 s (exponential
  backoff: 3 s base, 30 s max, 8 retries on failure). Transitions from `building`
  → `releasing` → `ready` (or `failed`).
- **Activate** — `POST /api/onboard/activate`. Promotes the built release to live.
- **Verify** — `GET /api/onboard/app?name=...` polls each app's runtime status
  (up to 30 attempts, 3 s apart) until every app reports `state: "live"`.

#### 1d. Live

`LivePanel` (`components/settings/onboarding/live-panel.tsx`) renders a success
card with the repo URL, clone instructions, and a link to open the agent in chat.

### Key components

| File | Role |
|---|---|
| `components/settings/onboarding/onboarding.tsx` | Parent — state init, redirect hydration, URL sync |
| `components/settings/onboarding/picker.tsx` | Path selection (One-click vs Fork & customize) |
| `components/settings/onboarding/oneshot-wizard.tsx` | Oneshot wizard layout & step rendering |
| `components/settings/onboarding/deploy-step.tsx` | Shared deploy state machine (dry-run, deploy, poll, activate, verify) |
| `components/settings/onboarding/live-panel.tsx` | Post-deploy success view |
| `lib/onboarding.ts` | State types, localStorage persistence, API functions |

### State machine (oneshot)

```
path: "oneshot"
oneshot: {
  installationId?: string    ← from GitHub redirect
  installationStatus?: string ← "bound" | "awaiting_webhook" | "awaiting_install"
  repo?: string              ← from create-repo call
  deploymentId?: string      ← from deploy call
  deployment?: OnboardDeployPayload  ← latest status payload
  releaseTags?: string[]     ← from deployment apps
  apps?: string[]            ← from deployment apps
  applicationId?: string     ← opaque backend identity
  live?: boolean             ← true after verification succeeds
}
```

---

## 2. Fork & customize

**Picker label:** "Fork & customize — You make your own repo from our template, then
we deploy it."

Grants a narrower GitHub App (`aomi-build`) scoped to a single repo
(contents, pull requests, checks).

### Step diagram

```
Template → Install → Deploy → Live
```

### Step-by-step

#### 2a. Create repo from template

The user clicks "Use this template" which opens
`https://github.com/aomi-labs/playground-example/generate` in a new tab. They
create their own repo on GitHub, then paste the `owner/name` back into the input
field. The portal normalises the input via `normalizeRepo()` (accepts full URLs or
`owner/name` format).

#### 2b. Install `aomi-build`

Same pattern as 1a, but `app=1` (the narrower `aomi-build` app) and the `repo`
param is set so GitHub scopes the install to that single repo. An "Already
installed?" button lets the user re-sync via `beginAuthorize` (mode `"authorize"`),
which calls the same OAuth start endpoint without re-prompting the install screen.

#### 2c. Deploy

Identical `DeployStep` component as 1c, but with `path="bootstrap"` and an
additional `onReconnectInstall` button in the error state.

#### 2d. Live

Same `LivePanel` as 1d.

### State machine (bootstrap)

```
path: "bootstrap"
bootstrap: {
  installationId?: string    ← from GitHub redirect
  installationStatus?: string
  repo?: string              ← user-supplied, from template
  deploymentId?: string
  deployment?: OnboardDeployPayload
  releaseTags?: string[]
  apps?: string[]
  applicationId?: string
  live?: boolean
}
```

---

## 3. Access after deploy

When the deploy reaches the `live` phase, the `LivePanel` shows:

1. **Live confirmation** — Green card with checkmark: "`owner/repo` is live in your
   chat session."
2. **Clone instructions** — `git clone`, `cd`, edit, and `aomi-build deploy`.
3. **Open in chat** — A link to `/chat` (delegates to the agent's chat session if a
   `chatUrl` was returned by the platform).
4. **Open repo** — Link to `https://github.com/owner/repo`.

The wizard's `Stepper` shows all four steps complete (green checkmarks).

### URL deep-link

Once a `deploymentId` exists, the portal writes `?deployment_id=<id>&deploy_path=
oneshot|bootstrap` to the browser URL. On page load the params are read as a
fallback if localStorage has been cleared, so bookmarked URLs partially survive
a cache clear.

---

## Backend API surface

All calls go through the portal's own `/api/onboard/*` routes (BFF pattern), which
proxy the platform backend with scoped activation tokens:

| Route | Method | Purpose |
|---|---|---|
| `/api/onboard/dry-run` | POST | Preview deployment manifest |
| `/api/onboard/deploy` | POST | Kick off platform CI |
| `/api/onboard/status` | GET | Poll deployment/release progress |
| `/api/onboard/activate` | POST | Promote release to live |
| `/api/onboard/app` | GET | Check single app's runtime status |
| `/api/onboard/create` | POST | Create repo from template (oneshot only) |
| `/api/onboard/sync-installed` | POST | Re-sync an already-installed source |
| `/api/integrations/github-app/oauth/start` | GET | Get GitHub App install URL |

The activation token is minted per-request via `activationEnv()` which reads the
server-side `APP_DEPLOY_ACTIVATION_TOKEN` and wraps it into a `platform.auth` block
— the browser never sees platform secrets.

---

## Key improvements (June 2026)

| # | Issue | Fix |
|---|---|---|
| 1 | Deploy used admin secret directly | `activationEnv()` mints scoped platform tokens |
| 2 | `chatUrl` never surfaced to `LivePanel` | Wired from deploy response → both wizards |
| 3 | `releasing` state fell through to `building` | Handled in poll loop |
| 4 | `pending` state from 404 on first poll | Recognised as distinct from `building` |
| 5 | Start Over hidden during active phases | Visible during all non-error phases |
| 6 | No verification attempt counter | Shows "Checking runtime... attempt 3/30" |
| 7 | `deploymentId` not in URL params | Synced via `replaceState` |
| 8 | Deployment ID not copyable | Clipboard button added |
| 9 | No backoff on poll failures | Exponential: 3 s base, 30 s max, 8 retries |
| 10 | Deploy required dry-run to complete | Deploy always runs dry-run first if missing |
| 11 | Deploy button disabled without dry-run | Always enabled (auto-runs dry-run) |
| 12 | No "recommended" badge on one-click | Badge added to picker card |
| 13 | No green banner after install redirect | 6-second auto-dismiss banner |
| 14 | 404 on first status poll | Server returns `{state:"pending"}` |

See PRs #210 (security/state machine), #211 (UX/robustness), and #212 (banner/URL).
