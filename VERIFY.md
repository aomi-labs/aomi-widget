# Deploy Flow — Verification Checklist

## 0. Quick Gates (run these first)

```bash
# Full test suite
npx vitest run

# Type checks
npx tsc --noEmit -p apps/portal/tsconfig.json
npx tsc --noEmit --project packages/deploy/tsconfig.json
npx tsc --noEmit --project packages/client/tsconfig.json
```

Expect: **0 failures, 0 type errors.**

---

## 1. Portal UI — One-click Deploy (manual)

Open `https://chat.aomi.dev/settings`

### 1a. Picker screen
- [ ] Both cards render: "One-click" and "Fork & customize"
- [ ] One-click has a "(recommended)" badge
- [ ] Clicking "Install on GitHub" redirects to GitHub App install page

### 1b. Install + create
- [ ] After install, browser redirects back to `/settings?installation_id=...&onboard=bound`
- [ ] Green banner appears: "GitHub App installed successfully"
- [ ] Auto-dismisses after ~6 seconds
- [ ] "Create repo" creates the template fork
- [ ] Repo name (`owner/name`) appears in the UI

### 1c. Deploy
- [ ] Dry-run completes: shows deployment manifest
- [ ] Deploy button triggers `POST /api/onboard/deploy`
- [ ] Progress bar appears during build
- [ ] Polling spinner shows attempt counter (e.g. "Checking... attempt 3/30")
- [ ] URL updates with `?deployment_id=<id>&deploy_path=oneshot`
- [ ] Deployment ID is copyable (clipboard button)

### 1d. Activate + verify
- [ ] Activate button enabled when status is `ready`
- [ ] Verification spinner shows counter (e.g. "Checking runtime... attempt 3/30")
- [ ] On success: LivePanel shows green card with checkmark
- [ ] "Open in chat" link appears (if `chatUrl` is configured)
- [ ] "Open repo" link points to `https://github.com/owner/repo`

### 1e. Error recovery
- [ ] Start Over button visible during all non-error phases
- [ ] Backend 4xx/5xx shows error message (not generic spinner)
- [ ] Network failure shows "check your connection" message
- [ ] Polling timeout shows "timeout" with link to check CI manually

---

## 2. Portal UI — Fork & Customize (manual)

### 2a. Template
- [ ] "Use this template" button opens GitHub template page in new tab
- [ ] Pasting `owner/name` URL is accepted
- [ ] Pasting `https://github.com/owner/name` is accepted
- [ ] `normalizeRepo()` strips protocol and `.git` suffix
- [ ] Empty/full-name validation shows error

### 2b. Install + deploy
- [ ] "Install on GitHub" opens scoped install for single repo
- [ ] "Already installed?" re-auth flow works
- [ ] Deploy phase is identical to one-click flow

---

## 3. CLI (manual)

```bash
# Prerequisite: authenticated session
aomi account login

# 3a. Deploy
aomi deploy --commit
```

- [ ] Validates git state (must be inside a git repo)
- [ ] Uploads source, returns deployment ID
- [ ] On failure: shows actionable error (not a stack trace)

```bash
# 3b. Status
aomi status
```

- [ ] Shows live terminal output of deployment progress
- [ ] Polls with backoff, shows attempt count
- [ ] On 4xx: exits early with clear error message
- [ ] On timeout: "Deployment timed out; check CI at <url>"

```bash
# 3c. Activate
aomi activate
```

- [ ] Promotes built release to live
- [ ] On partial failure: lists which apps failed with their errors
- [ ] On `ok: false`: throws `DeployError` with code `ACTIVATION`

```bash
# 3d. Help
aomi deploy --help
aomi status --help
aomi activate --help
```

- [ ] Complete usage shown with all flags
- [ ] No formatting issues

---

## 4. BFF Security (automated)

```bash
# Portal security tests (CSRF, rate-limit, validation)
npx vitest run --config apps/portal/vitest.config.ts apps/portal/src/lib/__tests__/
```

- [ ] 17/17 portal security tests pass
- [ ] CSRF test verifies fail-open when `NEXT_PUBLIC_APP_URL` unset
- [ ] Rate-limit test verifies 60 req/min window
- [ ] Validation test verifies empty `releaseTags` passes

---

## 5. Deploy SDK (automated)

```bash
# SDK tests
npx vitest run packages/deploy/test/
```

- [ ] Client tests pass (activate throws on `ok=false`)
- [ ] Activation-request tests pass
- [ ] Watch-deployment PBTs pass
- [ ] `DeployError` carries reason in partial failure

---

## 6. CLI Tests (automated)

```bash
# CLI tests
npx vitest run packages/client/test/cli/
```

- [ ] Deploy-errors PBTs pass
- [ ] All existing CLI unit tests still pass (no regressions)

---

## 7. Full CI Pipeline

After merging, the GitHub Actions `build-and-lint` check must:
- [ ] `pnpm vitest run` — 0 failed across 45+ test files
- [ ] Portal typecheck — 0 errors
- [ ] Deploy SDK typecheck — 0 errors
- [ ] Client SDK build — 0 errors
- [ ] Vercel previews — all 4 green (base, chat-portal, landing-page, tg-mini-app)

---

## 8. Backend Contract (manual / curl)

```bash
# Verify error response shape (replace with real values)
curl -s https://staging-api.aomi.dev/api/platforms/community/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"app_source_id": 99999}' \
  | jq .
```

- [ ] Invalid `app_source_id` returns `{"ok": false, "error": {"code": "...", "message": "..."}}`
- [ ] Valid request returns `202` with `deployment_id` and app list
- [ ] Activate with unknown release tags returns `422` with `ok: false`
- [ ] Activate with partial failure returns `200` with `ok: false` and per-app errors

---

## 9. Production Readiness Gates

- [ ] `NEXT_PUBLIC_APP_URL=https://chat.aomi.dev` set in Vercel
- [ ] No dead `applicationId` references in portal components
- [ ] No `dist/` conflicts in future PRs (use `.gitignore` or build-time generation)
- [ ] ALL deploy flow spec files in `specs/` match current implementation
- [ ] `pnpm vitest run` — 0 failed across full suite

---

## Quick Smoke

```bash
# One-liner to verify code quality before deploying:
pnpm vitest run && \
  npx tsc --noEmit -p apps/portal/tsconfig.json && \
  npx tsc --noEmit --project packages/deploy/tsconfig.json && \
  echo "✅ All gates pass"
```
