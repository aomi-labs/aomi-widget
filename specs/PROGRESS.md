# Progress Tracker

## Current Sprint Goal
Set up Fumadocs documentation site for aomi-widget

## Branch Status
- **Current Branch:** `new-docs`
- **Recent Commits:**
  - 0a000e8 Upgrade to Node 20 + Next.js 16 and remove all workarounds
  - 813d46b Add force-dynamic to all pages for fumadocs compatibility
  - e7998cb Fix fumadocs build issues and import paths
  - 560298e @ path
  - 62eca53 add example page
  - 91af70b fumadocs-mdx
  - 29bb224 mdx setup with fumadocs-mdx

## Recently Completed Work

| Task | Description | Key Changes |
|------|-------------|-------------|
| Fumadocs setup | Set up fumadocs-mdx documentation framework | source.config.ts, lib/source.tsx, app/docs layout |
| Node 20 upgrade | Upgraded from Node 18 to Node 20 | Required for Next.js 16 + fumadocs 16.x |
| Next.js 16 upgrade | Upgraded from Next.js 15.5.7 to 16.1.0 | Proper fumadocs compatibility |
| Examples collection | Added separate /examples route with MetaMask fork example | content/examples/, app/examples/ |
| Remove workarounds | Removed all hacks (force-dynamic, patch scripts, React aliases) | Clean SSG build |

## Files Modified This Sprint

### Documentation Setup
- `apps/docs/source.config.ts` - Fumadocs MDX configuration with shiki, twoslash
- `apps/docs/lib/source.tsx` - Docs and examples loaders
- `apps/docs/app/provider.tsx` - NEW: RootProvider wrapper for fumadocs
- `apps/docs/app/layout.tsx` - Added Provider wrapper
- `apps/docs/app/docs/layout.tsx` - DocsLayout with sidebar config
- `apps/docs/app/docs/[[...slug]]/page.tsx` - Dynamic docs pages
- `apps/docs/app/examples/layout.tsx` - Examples layout
- `apps/docs/app/examples/[[...slug]]/page.tsx` - Dynamic examples pages

### Content
- `apps/docs/content/docs/*.mdx` - 17 documentation pages
- `apps/docs/content/examples/metamask-fork.mdx` - MetaMask wallet example
- `apps/docs/content/docs/meta.json` - Sidebar navigation structure
- `apps/docs/content/examples/meta.json` - Examples navigation

### Configuration
- `apps/docs/package.json` - Next 16, fumadocs deps, removed workaround scripts
- `apps/docs/next.config.ts` - Simplified webpack config
- `apps/docs/tsconfig.json` - Added @/.source/* path mapping

### Deleted
- `apps/docs/scripts/patch-fumadocs-ui.mjs` - No longer needed

## Pending Tasks

### Documentation Content
- [ ] Fill in actual content for placeholder MDX pages
- [ ] Add API reference documentation
- [ ] Add component examples with live previews
- [ ] Add getting started guide

### Low Priority
- [ ] Add search functionality
- [ ] Add dark/light theme toggle
- [ ] Consider adding Algolia DocSearch

## Known Issues

None currently - build and dev server working correctly.

## Notes for Next Agent

### Environment Requirements
- **Node 20+ required** - fumadocs 16.x + Next.js 16 need Node 20
- Run `nvm use 20` before any commands

### Key Commands
```bash
pnpm --filter @aomi-labs/widget-docs dev    # Dev server
pnpm --filter @aomi-labs/widget-docs build  # Production build
```

### Architecture
- fumadocs-mdx generates `.source/` files at install time (postinstall script)
- Two collections: `docs` (main docs) and `examples` (code examples)
- RootProvider from fumadocs-ui/provider/next wraps the app
- All pages use SSG (Static Site Generation) - no force-dynamic

### File Structure
```
apps/docs/
├── content/
│   ├── docs/         # Documentation MDX files
│   └── examples/     # Example MDX files
├── app/
│   ├── docs/         # /docs routes
│   ├── examples/     # /examples routes
│   └── provider.tsx  # fumadocs RootProvider
├── lib/
│   └── source.tsx    # Loaders for docs + examples
└── source.config.ts  # fumadocs-mdx config
```
