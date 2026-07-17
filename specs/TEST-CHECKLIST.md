# Deploy Flow — Testing Checklist

Run through this checklist to verify all layers work before you demo or ship.

**Deployed Portal URLs:**
- **Production:** https://chat.aomi.dev/settings
- **Preview:** https://chat-portal-ec2p90hnr-aomi-labs.vercel.app/settings (auto-deployed from `main`)

---

## 1. Build & Lint

- [ ] `pnpm run build:lib` — SDK + CLI bundle builds without errors
- [ ] `pnpm run lint` — no lint violations
- [ ] `pnpm --filter landing build` — Portal app builds (catches type errors in wizard/BFF code)
- [ ] `cd apps/portal && npx tsc --noEmit` — Portal typecheck clean

---

## 2. Unit & Property Tests

- [ ] `pnpm --filter @aomi-labs/client test` — CLI tests pass (includes `deploy-errors.pbt.test.ts`)
- [ ] `cd apps/portal && pnpm vitest run` — Portal tests pass (includes `route-factory.pbt.test.ts`, `security.pbt.test.ts`)
- [ ] `pnpm --filter @aomi-labs/deploy test` — SDK tests pass (includes `watch-deployment.property.test.ts`)

---

## 3. CLI — How to Run

Build the CLI bundle first:

```bash
pnpm run build:lib
```

Then run commands via the built entry point:

```bash
node packages/client/dist/cli.mjs <command>
```

### 3a. Help output
- [ ] `node packages/client/dist/cli.mjs deploy --help` — Shows `--commit`, `--app-source-id` flags
- [ ] `node packages/client/dist/cli.mjs status --help` — Shows `--deployment-id` flag
- [ ] `node packages/client/dist/cli.mjs activate --help` — Shows `--deployment-id` flag

### 3b. Deploy error handling (no backend needed)
- [ ] Run from a non-git directory:
  ```bash
  cd /tmp && node /path/to/packages/client/dist/cli.mjs deploy --commit
  ```
  — Exits with `NOT_A_GIT_REPO` error

- [ ] Run from a git repo without `--app-source-id`:
  ```bash
  cd /path/to/aomi && node packages/client/dist/cli.mjs deploy --commit
  ```
  — Exits with `VALIDATION_ERROR`

### 3c. Deploy dry-run / CI trigger (requires live backend)
These need `AOMI_BACKEND_URL` pointing to a real backend:

```bash
export AOMI_BACKEND_URL=https://api-staging.aomi.dev
```

- [ ] `node packages/client/dist/cli.mjs deploy --commit --app-source-id <id>` — Returns a `deploymentId`
- [ ] `node packages/client/dist/cli.mjs status --deployment-id <id>` — Shows deployment progress
- [ ] `node packages/client/dist/cli.mjs activate --deployment-id <id>` — Promotes release to live

---

## 4. BFF — Route Health (Portal Dev Server)

Start the portal dev server with `pnpm --filter landing dev`.

### 4a. CSRF protection
- [ ] `curl -X POST http://localhost:3000/api/onboard/deploy` _(no CSRF token)_ — Returns 403
- [ ] `curl -X POST http://localhost:3000/api/onboard/activate` _(no CSRF token)_ — Returns 403

### 4b. Route factory — dry-run/deploy
- [ ] `POST /api/onboard/dry-run` with valid body — Returns 200 with deployment manifest
- [ ] `POST /api/onboard/dry-run` with missing body — Returns 4xx validation error
- [ ] `POST /api/onboard/deploy` with valid body — Returns 200 with `deploymentId`
- [ ] `POST /api/onboard/deploy` with invalid body — Returns 4xx validation error

### 4c. Status
- [ ] `GET /api/onboard/status?deploymentId=<valid>` — Returns deployment payload
- [ ] `GET /api/onboard/status` _(no deploymentId)_ — Returns 4xx

### 4d. Activate
- [ ] `POST /api/onboard/activate` with valid deploymentId — Returns success

### 4e. App verification
- [ ] `GET /api/onboard/app?name=<app-name>` — Returns app runtime status
- [ ] `GET /api/onboard/app` _(no name)_ — Returns 4xx

### 4f. Create repo (oneshot)
- [ ] `POST /api/onboard/create` — Returns repo owner/name

### 4g. Sync installed
- [ ] `POST /api/onboard/sync-installed` — Re-syncs installation

---

## 5. Portal UI — Onboarding Wizard

### 5a. Picker screen
- [ ] Visit `/settings` — Both path options visible ("One-click" + "Fork & customize")
- [ ] "One-click" card has "Recommended" badge
- [ ] "Fork & customize" card shows template URL

### 5b. One-click path
- [ ] Click "One-click" → Install GitHub App flow starts
- [ ] After install → Redirects back to `/settings?installation_id=...`
- [ ] Green banner "GitHub App installed successfully" shows and auto-dismisses in 6 seconds
- [ ] "Create repo" button visible → Click → Repo created
- [ ] Deploy step shows with progress bar
- [ ] Dry-run shows deployment manifest preview
- [ ] Deploy kicks off → Status polling shows: building → releasing → ready
- [ ] Activate promotes release
- [ ] Verify polls runtime status ("Checking runtime... attempt 3/30")

### 5c. Live panel
- [ ] Green success card: "owner/repo is live"
- [ ] Clone instructions shown (`git clone`, `cd`, `aomi-build deploy`)
- [ ] "Open in chat" link uses `chatAppUrl()` (configurable, not hardcoded)
- [ ] "Open repo" link goes to GitHub
- [ ] Stepper shows all steps complete (green checkmarks)
- [ ] URL has `?deployment_id=<id>&deploy_path=oneshot`

### 5d. Fork & customize path
- [ ] Click "Fork & customize" → Template link opens in new tab
- [ ] Paste repo `owner/name` → Input normalizes correctly
- [ ] Install GitHub App flow (scoped to single repo)
- [ ] "Already installed?" button re-syncs without re-prompting
- [ ] Same DeployStep component as one-click
- [ ] Error state shows "Reconnect Install" button

### 5e. Edge cases
- [ ] Page refresh during deploy — URL params restore `deploymentId`
- [ ] Start Over resets state during active phases
- [ ] Deployment ID is copyable (clipboard button)
- [ ] Backoff on poll failure — doesn't hammer server

---

## 6. SDK — Unit Tests

- [ ] `pnpm --filter @aomi-labs/deploy test` — All tests pass
- [ ] Property-based tests run with multiple seeds (no flakiness)

---

## 7. Regression — Existing Features Still Work

- [ ] Portal chat loads and sends messages
- [ ] Wallet connection (EVM + Solana) works
- [ ] Account settings render without errors
- [ ] GitHub App OAuth flow completes successfully

---

## 8. Full E2E (requires live backend)

- [ ] `aomi deploy --commit --app-source-id <id>` → `deploymentId` returned
- [ ] `aomi status --deployment-id <id>` → progress updates in real-time
- [ ] `aomi activate --deployment-id <id>` → release goes live
- [ ] Portal `/settings` wizard completes the same flow via UI
- [ ] Live agent accessible in chat after deploy

---

## Common Issues & How to Check

| Symptom | Likely Cause | Check |
|---|---|---|
| `DeployCliError` build error | Duplicate class from rebase | `specs/TEST-CHECKLIST.md` should catch on `pnpm run build:lib` |
| CSRF 403 on all routes | Missing CSRF token in curl | Use portal dev server + browser for UI tests |
| Portal build fails on server | `NEXT_PUBLIC_BACKEND_URL` unset | Set env var or verify CI conditional works |
| Property test timeout | `vi.useFakeTimers()` leaking | Check `watch-deployment.property.test.ts` setup |
| CLI command not found | Old dist bundle | Rebuild with `pnpm run build:lib` |
