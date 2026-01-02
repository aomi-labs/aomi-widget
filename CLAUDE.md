# Claude Code Instructions

## On Every Session Start
1. Read `specs/DOMAIN.md` - architecture rules and patterns
2. Read `specs/METADATA.md` - file layout and commands
3. Read `specs/STATE.md` - current work context and pending items

## After Completing a Task
Update `specs/STATE.md` with:
- What changed (files modified, features added/fixed)
- Any new pending items discovered
- Remove completed items from pending list

## Quick Reference

**Build & Test:**
```bash
pnpm run build:lib        # Build library to dist/
pnpm --filter landing dev # Run demo at localhost:3000
pnpm lint                 # Lint check
```

**Key Files:**
- `src/components/aomi-frame.tsx` - Main widget component
- `src/components/assistant-ui/runtime.tsx` - Backend integration
- `src/lib/backend-api.ts` - All network calls
- `src/lib/thread-context.tsx` - Thread state management
