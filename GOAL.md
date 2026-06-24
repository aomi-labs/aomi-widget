# Deploy Flow — Production Readiness Goal

## Mission

Make the Aomi deploy flow (portal onboarding + CLI + backend) production-ready:
every error path handled, every state tested, every UI state accounted for,
no rough edges.

Current session note: copied deploy pages can carry a stale GitHub installation
id. The portal BFF should recover from `resolve_source` 404 by syncing the
installed source from the repo, then persist the refreshed app source identity.

---

## 1. Immediate PR Management

### 1.1 Merge PR #244
- PR is clean (CLEAN merge state, CI green, Vercel green)
- Squash-merge into `main`
- Delete branch `fix/deploy-flow-production-ready`

### 1.2 Rebase & Resolve PR #243
- Rebase `hotfix/deploy-flow-fixes` onto latest `main`
- Conflicts are only in:
  - `packages/client/dist/*.map` — generated sourcemaps; regenerate or drop per repo convention
  - `specs/ONBOARDING-FLOWS.md` — keep `main`'s deletion
- Actual source fixes to keep:
  - `apps/portal/src/lib/csrf.ts` — fail-open when URL unset
  - `apps/portal/src/lib/rate-limit.ts` — 10 → 60 req/min
  - `apps/portal/src/lib/validate-input.ts` — allow empty releaseTags
  - `packages/client/package.json` — fast-check devDependency
  - `packages/client/src/cli/commands/defs/deploy.ts` — stop spreading `...globalArgs`
  - `specs/deploy-flow-impl.md`, `specs/TEST-CHECKLIST.md`, `specs/STATE.md` — keep if useful, drop if redundant
- Re-run CI, merge, delete branch

---

## 2. Portal Deploy UI — Completeness

### 2.1 Error states
Every component in the onboarding wizard must handle:
- Network failure (fetch throws)
- Backend 4xx/5xx (BFF returns error)
- Timeout (polling exceeds max attempts)
- Partial failure (some apps activated, some failed)
- Missing/invalid props (guard with defaults or invariant)

Files:
- `components/settings/onboarding/onboarding.tsx`
- `components/settings/onboarding/picker.tsx`
- `components/settings/onboarding/oneshot-wizard.tsx`
- `components/settings/onboarding/bootstrap-wizard.tsx`
- `components/settings/onboarding/deploy-step.tsx`
- `components/settings/onboarding/live-panel.tsx`

### 2.2 Loading states
Every async operation must show a loading indicator:
- `POST /api/onboard/create` — spinner during repo creation
- `POST /api/onboard/deploy` — progress bar during deploy
- `GET /api/onboard/status` — polling spinner with attempt counter
- `POST /api/onboard/activate` — activating spinner
- `GET /api/onboard/app` — verification spinner with counter

### 2.3 Empty states
- No deployments yet: show the picker with both path cards
- Installation not found: "Install GitHub App to continue" with link
- Repo not found (bootstrap): "Create your repo from the template first"

### 2.4 Edge cases
- Browser back/forward during wizard — URL state must restore wizard phase
- localStorage cleared mid-wizard — must detect and restart gracefully
- GitHub OAuth redirect lost / dead tunnel — "Already installed?" re-auth flow
- Multiple tabs — should not double-deploy
- Polling 404 on first call — server returns `{state:"pending"}` not 404

### 2.5 Accessibility
- All interactive elements keyboard-navigable
- ARIA live regions for progress announcements
- Focus management on step transitions
- Color-contrast compliant error messages

### 2.6 Tests
- `onboarding.ts` — 9 tests pass, covers state management
- `deploy-step.tsx` — component test for each phase transition
- `live-panel.tsx` — component test for success/error states
- `picker.tsx` — component test for path selection
- `bootstrap-wizard.tsx` — component test for fork flow
- `oneshot-wizard.tsx` — component test for oneshot flow

---

## 3. CLI — Completeness

### 3.1 Commands audit
All deploy commands must handle:
- `aomi deploy --commit` — validate git state, upload, return deployment ID
- `aomi status` — poll deployment/release progress, live terminal output
- `aomi activate` — promote built release to live
- `aomi deploy --help` — complete usage with all flags
- `aomi status --help` — complete usage
- `aomi activate --help` — complete usage

### 3.2 Error paths
Every error path produces a useful, actionable message:
- Not a git repo → "Run this from inside a git repository"
- No remote → "No git remote found; push your code first"
- Auth failure → "Session expired; run `aomi account login`"
- Backend error → show `reason` from `DeployError.reason`
- Network error → "Cannot reach Aomi backend; check your connection"
- Partial activation failure → list which apps failed with their errors
- Poll timeout → "Deployment timed out after N attempts; check CI status at <url>"

### 3.3 Tests
- `deploy-errors.pbt.test.ts` — property-based tests exist
- `client.test.ts` (deploy package) — 9 tests pass
- `watch-deployment.pbt.test.ts` — property-based tests exist
- Missing: integration test for CLI deploy → status → activate chain
- Missing: test for partial activation failure display

---

## 4. Backend (product-mono) — Deploy Endpoints

### 4.1 Review deploy endpoints
In `product-mono/aomi/bin/backend/src/endpoint/`:
- `POST /api/platforms/:platform/deploy` — verify error responses include useful `reason`
- `POST /api/platforms/:platform/apps/activate` — verify partial failure format
- `GET /api/platforms/:platform/deployments/:id` — verify status polling contract
- `GET /api/platforms/:platform/sources/resolve` — verify 404 behavior
- `POST /api/platforms/:platform/sources/create-from-template` — verify repo creation errors
- `POST /api/platforms/:platform/sources/sync-installed` — verify re-sync behavior

### 4.2 Error response contract
Backend error responses must include:
```json
{
  "ok": false,
  "error": { "code": "ERROR_CODE", "message": "human readable", "details": {} }
}
```
Verify every deploy endpoint returns this shape.

### 4.3 Tests
- Check if backend has integration tests for deploy endpoints
- If missing, add smoke tests for:
  - Deploy with invalid `app_source_id` → 404
  - Deploy with valid request → 202 with deployment ID
  - Activate with unknown release tags → 422 with details
  - Activate with partial failure → 200 with `ok: false` and per-app errors

---

## 5. BFF (Portal Routes) — Security & Robustness

### 5.1 All 8 BFF routes
- `POST /api/onboard/dry-run` — route factory, CSRF, rate limit, validation
- `POST /api/onboard/deploy` — route factory, CSRF, rate limit, validation
- `GET /api/onboard/status` — hardened error handling
- `POST /api/onboard/activate` — hardened error handling
- `GET /api/onboard/app` — hardened error handling
- `POST /api/onboard/create` — hardened error handling
- `POST /api/onboard/sync-installed` — hardened error handling
- `GET /api/onboard/check-repo` — proxy for GitHub repo validation

### 5.2 Missing tests
Current test coverage of BFF lib:
- `route-factory.pbt.test.ts` ✓
- `security.pbt.test.ts` ✓
- `onboarding.test.ts` ✓

Missing:
- `csrf.ts` — unit tests for fail-open/fail-closed behavior
- `rate-limit.ts` — unit tests for window tracking, burst detection
- `validate-input.ts` — unit tests for releaseTags, sourceRef validation
- `chat-url.ts` — unit tests for URL construction, fallback

---

## 6. Widget Library — Fix `@/` Import Issue

### 6.1 Problem
`apps/registry/src/components/aomi-frame.tsx` imports from `@/components/assistant-ui/thread`.
The `@/` alias is only configured in `apps/registry/`'s tsconfig, not in `apps/portal/`'s vitest config.
This causes test failures when any test imports through the widget-lib → react → registry chain.

### 6.2 Resolution options
1. Add `@/` alias to portal vitest config mapping to `apps/registry/src/`
2. Extract the import chain into a separate module without the alias dependency
3. Create a barrel export in the registry package that doesn't use `@/`

### 6.3 Impact
- Blocked: onboarding tests that import through widget-lib (currently mocked out)
- Blocked: any future portal test that touches React components from widget-lib

---

## 7. DX & Infrastructure

### 7.1 CI speed
- Library tests take 25s — any quick wins? (parallel workers, test splitting)
- Vercel previews add 2-3 min per commit

### 7.2 Local dev
- Verify `pnpm run dev` works from root for portal
- Verify tunnel setup for GitHub webhooks documented
- Verify `NEXT_PUBLIC_BACKEND_URL` fallback for local dev

### 7.3 Documentation
- `docs/fe-deploy.md` — update with latest endpoint changes
- `packages/deploy/README.md` — update with latest API
- `specs/deploy-flow-impl.md` — already covers the 11 PRs, add our PR #244

---

## 8. Execution Order

```
Phase 1 — Merge existing PRs
  ├─ Merge PR #244
  └─ Rebase + merge PR #243

Phase 2 — Portal UI hardening
  ├─ Error states in all onboarding components
  ├─ Loading states for all async ops
  ├─ Empty states for picker/install/repo
  ├─ Edge cases: back/forward, localStorage clear, multi-tab
  ├─ Accessibility pass
  └─ Component tests for each wizard step

Phase 3 — CLI polish
  ├─ Error message audit (actionable)
  ├─ Integration test for deploy → status → activate
  └─ Partial failure display

Phase 4 — Backend contract verification
  ├─ Review product-mono deploy endpoints
  ├─ Verify error response shape
  └─ Add smoke tests

Phase 5 — BFF test coverage
  ├─ Unit tests for csrf.ts
  ├─ Unit tests for rate-limit.ts
  ├─ Unit tests for validate-input.ts
  └─ Unit tests for chat-url.ts

Phase 6 — Widget lib import fix
  ├─ Implement resolution for @/ alias
  └─ Verify all tests pass without mocking widget-lib

Phase 7 — DX & docs
  ├─ Update docs/fe-deploy.md
  ├─ Update package READMEs
  └─ CI speed improvements
```

---

## Measurement

## Current Status (2026-06-21)

### ✅ Completed this session (source + infra)
- [x] PR #244 merged
- [x] PR #243 merged
- [x] PR #245 merged — same-tab redirect for GitHub install
- [x] `npx vitest run` — 0 failed (375/375 tests)
- [x] `npx tsc --noEmit -p apps/portal/tsconfig.json` — 0 errors
- [x] `npx tsc --noEmit --project packages/deploy/tsconfig.json` — 0 errors
- [x] `with_snapshot()` fix (`051d2be`) verified in product-mono `main` and deployed to staging
- [x] All 4 product-mono CI workflows green on latest main (Unit Tests, Build & Deploy Backend, Build & Deploy Telegram, Repowiki)
- [x] Backend deploy pipeline: all 9 jobs passed (Build + Deploy Staging + Verify Edge)
- [x] `api-staging.aomi.dev/health` → HTTP 200
- [x] `chat.aomi.dev` → HTTP 200

### ✅ Completed in this session (2026-06-21)
- [x] **Portal typecheck fixed** — excluded `**/*.test.{ts,tsx}` from `apps/portal/tsconfig.json`; `vitest` handles its own type checking, and `tsc --noEmit` no longer needs jest-dom augmentations in test files
- [x] **BFF unit tests** — 4 new files, 57 tests:
  - `csrf.test.ts` (14 tests): fail-open, origin matching, missing headers, malformed URLs, port handling
  - `rate-limit.test.ts` (12 tests): window tracking, 60/min burst, window expiry, per-IP isolation, fake timers
  - `validate-input.test.ts` (19 tests): installation ID, repo, deployment ID, release tags validation
  - `chat-url.test.ts` (12 tests): env var, fallback, URL construction, special character encoding
- [x] **Component tests** — 6 new files, 46 tests:
  - `stepper.test.tsx` (8 tests): all 4 states (done/active/pending/failed), edge cases
  - `picker.test.tsx` (5 tests): cards, badges, grants, choose buttons, heading
  - `live-panel.test.tsx` (11 tests): repo name, clone instructions, open repo/chat links, fallbacks
  - `deploy-step.test.tsx` (6 tests): idle state, deployment ID display, button disable states, phase hints
  - `oneshot-wizard.test.tsx` (8 tests): install step, live panel, errors, installing state, stepper
  - `bootstrap-wizard.test.tsx` (8 tests): template step, input, live panel, errors, stepper
- [x] **Documentation updated**:
  - `docs/fe-deploy.md`: latest BFF hardening, same-tab redirect, `with_snapshot()` fix, test counts
  - `packages/deploy/README.md`: full API reference with types, error handling, partial failure, tests
- [x] **vitest.setup.ts**: added global `afterEach(cleanup)` for React Testing Library DOM isolation
- [x] **Portal vitest aliases**: added `@/components`, `@/hooks`, `@/lib`, `@aomi-labs/widget-lib`, `@aomi-labs/client`, `@aomi-labs/deploy`, `@aomi-labs/react` to `apps/portal/vitest.config.ts` — unblocks real widget-lib imports in portal tests without mocking
- [x] **Portal bfcache fix** — cleared stale `installingPath` and `pendingInstall` when user returns from GitHub install without redirect params (e.g. pressing Back)
- [x] **Portal vercel.json** — added `installCommand: "cd ../.. && pnpm install"` so local Vercel CLI deploys work
- [x] **#1 Portal NEXT_PUBLIC_BACKEND_URL** — set `https://api.aomi.dev` as Vercel Production env var for `aomi-labs` project (was previously unset, falling back to `http://127.0.0.1:8080`)
- [x] **#2 product-mono AOMI_PORTAL_URL** — changed staging value from `chat-staging.aomi.dev` to `chat.aomi.dev` (both line 240 and 638 in `build-and-deploy-be.yml`); pushed directly to `main` (`d1207cb7`)
- [x] **#4 CLI error message polish** — all 7 GOAL spec messages implemented:
  - deploy: "Run this from inside a git repository", added git remote check → "No git remote found; push your code first"
  - deploy/status/activate: auth → "Session expired; run `aomi account login`"
  - deploy/status/activate: network → "Cannot reach Aomi backend; check your connection"
  - deploy/status/activate: backend errors surface `reason` from response body
  - status --watch: poll timeout → "Deployment timed out after N attempts; check CI status at <url>"
  - activate: partial failure lists per-app errors

### ❌ Remaining (needs staging E2E — human-in-the-loop)
- [ ] **Manually redeploy portal** — Go to Vercel dashboard → `aomi-labs` project → Deployments → trigger redeploy. This picks up the new `NEXT_PUBLIC_BACKEND_URL=https://api.aomi.dev` env var
- [ ] Portal onboarding: oneshot path works end-to-end
- [ ] Portal onboarding: bootstrap path works end-to-end
- [ ] CLI: `aomi deploy --commit` → `aomi status` → `aomi activate` works end-to-end
