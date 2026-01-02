# Progress Tracker

## Current Sprint Goal
Landing page with documentation and shadcn component registry

## Branch Status
- **Current Branch:** `new-docs`
- **Recent Commits:**
  - 542d995 rename docs to guilds
  - c6e3b09 remove old landing, change docs to landing
  - 24ab90d use /widget.aomi.dev/r as component hosting domain
  - 01740b4 updated docs with shadcn
  - 5b7260f revert back the unchanged lib with assistantUI("markdown-text")
  - 2049d28 whole pnpm workspace clear
  - 8b04b57 updates
  - a527410 applyied styles
  - 341969c applyied styles
  - 30418d4 added actual content

## Recently Completed Work

| Task | Description | Key Changes |
|------|-------------|-------------|
| Rename docs to landing | Consolidated docs app as main landing page | apps/docs → apps/landing |
| Shadcn registry | Created component registry for shadcn-style distribution | apps/registry with build scripts |
| Documentation restructure | Reorganized content into guides, api, examples | content/guides/, content/api/, content/examples/ |
| Widget hosting domain | Set up widget.aomi.dev/r as component hosting | Registry outputs to dist/ |
| Workspace cleanup | Cleaned up pnpm workspace structure | Removed old landing app |

## Files Modified This Sprint

### Landing App (apps/landing/)
- `source.config.ts` - Fumadocs MDX configuration
- `lib/source.tsx` - Docs, API, and examples loaders
- `app/provider.tsx` - RootProvider wrapper
- `app/layout.tsx` - Main layout with fonts
- `app/docs/layout.tsx` - Docs layout with sidebar
- `app/api/layout.tsx` - API reference layout
- `app/examples/layout.tsx` - Examples layout

### Content (apps/landing/content/)
- `guides/*.mdx` - 15 guide pages (about-aomi, architecture, cli, components, etc.)
- `api/*.mdx` - API reference (sessions, system)
- `examples/*.mdx` - Examples (metamask, polymarket)
- `*/meta.json` - Navigation structure files

### Registry App (apps/registry/)
- `package.json` - @aomi-labs/widget-lib package
- `scripts/build-registry.js` - Registry build script
- `src/components/aomi-frame.tsx` - Main widget component
- `src/components/assistant-ui/*.tsx` - Assistant UI components
- `src/components/ui/*.tsx` - UI primitives
- `dist/*.json` - Built registry files

### Playground Components
- `apps/landing/src/components/playground/` - Preview, CopyButton
- `apps/landing/src/components/samples/widget-demo.tsx` - Demo component

## Pending Tasks

### Documentation Content
- [ ] Fill in actual content for placeholder MDX pages
- [ ] Complete API reference documentation
- [ ] Add more code examples with live previews

### Registry
- [ ] Verify all components build correctly
- [ ] Test shadcn add workflow

### Low Priority
- [ ] Add search functionality (Algolia DocSearch)
- [ ] Add dark/light theme toggle

## Known Issues

None currently - build and dev server working correctly.

## Notes for Next Agent

### Environment Requirements
- **Node 20+ required** - fumadocs 16.x + Next.js 16 need Node 20
- Run `nvm use 20` before any commands

### Key Commands
```bash
pnpm --filter landing dev              # Dev server at :3000
pnpm --filter landing build            # Production build
pnpm --filter @aomi-labs/widget-lib build  # Build registry
```

### Architecture
- **Landing** (`apps/landing/`) - Main site with fumadocs documentation
- **Registry** (`apps/registry/`) - Shadcn-style component registry
- fumadocs-mdx generates `.source/` files at install time (postinstall)
- Three collections: `guides` (docs), `api` (reference), `examples`
- Components hosted at widget.aomi.dev/r

### File Structure
```
apps/
├── landing/              # Landing page + docs
│   ├── content/
│   │   ├── guides/       # Documentation guides
│   │   ├── api/          # API reference
│   │   └── examples/     # Code examples
│   ├── app/
│   │   ├── docs/         # /docs routes (guides)
│   │   ├── api/          # /api routes
│   │   └── examples/     # /examples routes
│   ├── lib/source.tsx    # Content loaders
│   └── source.config.ts  # fumadocs-mdx config
└── registry/             # Shadcn component registry
    ├── src/components/   # Source components
    ├── dist/             # Built registry JSON
    └── scripts/          # Build scripts
```
