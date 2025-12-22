# Progress Tracker

## Current Sprint Goal
Address Codex code quality issues and technical debt

## Branch Status
- **Current Branch:** `system-notification`
- **Recent Commits:**
  - 71db183 rename landing
  - d5f8ecc mdx
  - 3956de4 fix linting + running
  - 0524c79 new docs page
  - df61f47 styling migrated

## Recently Completed Work

| Task | Description | Files |
|------|-------------|-------|
| Fix CSS copy command | Replaced platform-specific `cp` command with cross-platform Node fs API using esbuild plugin | `tsup.config.ts:1-19,57` |
| Update build docs | Updated example package name from `example` to `landing` in CLAUDE.md | `CLAUDE.md:19` |

## Files Modified This Sprint

### Build Configuration
- `tsup.config.ts` - NEW: Added `copyStylesPlugin` using Node's `fs` module for cross-platform CSS/theme copying
- `CLAUDE.md` - Updated example dev command to use correct package name

## Pending Tasks

### High Priority - Codex Issues
- [ ] Remove bundle-level `"use client"` directive - Move to individual component files
- [ ] Add debug flag for production logging - Gate console.logs in `backend-api.ts`
- [ ] Fix SSE reconnection logic - Persist attempt counter as class property
- [ ] Fix double AppKit initialization - Remove side effect from `config.tsx`

### Low Priority
- [ ] Consider adding TypeScript strict mode checks
- [ ] Review error handling patterns across API methods

## Known Issues

### From Codex Review
1. **Bundle-level "use client"** (tsup.config.ts) - Forces entire library to client-side, prevents server component usage
2. **Excessive production logging** (backend-api.ts:64-252) - Logs sensitive data (chat messages, wallet IDs) to production console
3. **Broken SSE reconnection** (backend-api.ts:178-193) - Attempt counter resets to 0 on each call, loops forever
4. **Double AppKit init** (example/src/components/) - `config.tsx` and `wallet-providers.tsx` both call `createAppKit()`

## Notes for Next Agent
- ✅ CSS copy issue (#2) is FIXED - now uses Node fs API via esbuild plugin
- ❌ "use client" banner still at bundle level - needs to be moved to individual files
- ❌ All API methods still log extensively - needs debug flag implementation
- ❌ SSE reconnection will loop forever - `attempt` variable is re-declared each time
- ❌ AppKit initialized twice in example app - config.tsx has side effect

### Implementation Notes
- When fixing "use client": Add directive to files using hooks/browser APIs only (e.g., components using useState, useEffect, window)
- When fixing logging: Consider environment variable `AOMI_DEBUG` or build-time flag
- When fixing SSE: Make `reconnectAttempt` a class property, add exponential backoff
- When fixing AppKit: Remove `createAppKit()` call from config.tsx:47, keep only in wallet-providers.tsx
