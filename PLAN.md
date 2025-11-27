# Plan: Convert to Publishable NPM Library

## Goal
Transform `assistant-ui-starter` into a publishable npm library that the `example/` project can consume as a standalone app would consume any npm package.

---

## Current State

```
npm-lib-2/
├── app/                    # Next.js app (dev/demo)
├── src/                    # Library source (NOT built)
│   ├── components/
│   │   ├── ui/             # 13 shadcn-style components
│   │   ├── assistant-ui/   # 8 AI chat components
│   │   ├── aomi-frame.tsx  # Main frame component
│   │   └── wallet-providers.tsx
│   ├── hooks/
│   │   └── use-mobile.tsx
│   └── lib/
│       ├── utils.ts
│       ├── thread-context.tsx
│       ├── backend-api.ts
│       └── conversion.ts
├── example/                # Consumer app (imports from ../src via alias)
└── package.json            # Not configured for library publishing
```

## Target State

```
npm-lib-2/
├── src/                    # Library source
│   ├── index.ts            # Main entry point
│   ├── components/
│   ├── hooks/
│   └── lib/
├── dist/                   # Built library output
│   ├── index.js            # ESM bundle
│   ├── index.cjs           # CommonJS bundle
│   ├── index.d.ts          # TypeScript declarations
│   └── styles.css          # Bundled CSS (theme variables)
├── package.json            # Configured for npm publishing
├── app/                    # Dev app (unchanged)
└── example/                # Standalone consumer app
    ├── package.json        # Has "aomi-ui": "file:.." as dependency
    ├── app/
    │   ├── globals.css     # Own styles + @import "aomi-ui/styles.css"
    │   └── page.tsx        # import { AomiFrame } from "aomi-ui"
    └── tsconfig.json       # No parent path aliases
```

---

## Implementation Steps

### Phase 1: Library Build Setup

#### 1.1 Create Entry Points
Create `src/index.ts` with organized exports:

```typescript
// Main component
export { AomiFrame } from "./components/aomi-frame";

// Runtime & Context
export { AomiRuntimeProvider, useRuntimeActions } from "./components/assistant-ui/runtime";
export { ThreadContextProvider, useThreadContext } from "./lib/thread-context";

// UI Components
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/dialog";
// ... etc

// Assistant UI Components
export { Thread } from "./components/assistant-ui/thread";
export { ThreadList } from "./components/assistant-ui/thread-list";
export { ThreadListSidebar } from "./components/assistant-ui/threadlist-sidebar";
export { MarkdownText } from "./components/assistant-ui/markdown-text";

// Hooks
export { useIsMobile } from "./hooks/use-mobile";

// Utilities
export { cn } from "./lib/utils";
```

#### 1.2 Create Styles Entry
Create `src/styles.css` that consumers can import:

```css
/* Theme CSS variables only - consumers bring their own Tailwind */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  /* ... all theme variables */
}

.dark {
  /* dark mode variables */
}
```

#### 1.3 Install Build Tool
Add `tsup` for building:

```bash
npm install -D tsup
```

#### 1.4 Configure tsup
Create `tsup.config.ts`:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "next",
    "@assistant-ui/react",
    "@assistant-ui/react-markdown",
    // ... peer dependencies
  ],
});
```

#### 1.5 Update package.json for Publishing

```json
{
  "name": "aomi-ui",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "scripts": {
    "build:lib": "tsup",
    "dev": "next dev --turbopack",
    "build": "next build",
    "prepublishOnly": "npm run build:lib"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "tailwindcss": "^4.0.0",
    "@assistant-ui/react": "^0.11.0",
    "@assistant-ui/react-markdown": "^0.11.0",
    "@radix-ui/react-avatar": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-tooltip": "^1.0.0",
    "@reown/appkit": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "lucide-react": "^0.500.0",
    "zustand": "^5.0.0"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  }
}
```

---

### Phase 2: Update Example as Standalone Consumer

#### 2.1 Update example/package.json

```json
{
  "name": "example",
  "dependencies": {
    "aomi-ui": "file:..",
    // All peer dependencies explicitly listed
    "@assistant-ui/react": "^0.11.28",
    "@assistant-ui/react-markdown": "^0.11.1",
    // ... etc
  }
}
```

#### 2.2 Update example/tsconfig.json
Remove parent path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### 2.3 Update example/app/page.tsx
Import from package name:

```tsx
import { AomiFrame } from "aomi-ui";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <AomiFrame height="720px" width="1200px" />
    </main>
  );
}
```

#### 2.4 Update example/app/globals.css
Import library styles:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "aomi-ui/styles.css";

/* Example app's own customizations */
```

#### 2.5 Update example/next.config.ts
Remove webpack aliases (no longer needed):

```typescript
const nextConfig: NextConfig = {};
export default nextConfig;
```

#### 2.6 Create example/src/ for local components (optional)
If example needs its own components:

```
example/
├── src/
│   └── components/    # Example-specific components
├── app/
└── ...
```

---

### Phase 3: Handle Tailwind CSS Classes

**Problem**: Library components use Tailwind classes, but classes need to be generated at consumer's build time.

**Solution**: Consumers must configure Tailwind to scan the library:

#### Option A: @source directive (Tailwind v4)
In consumer's `globals.css`:
```css
@import "tailwindcss";
@source "../../node_modules/aomi-ui/dist";
```

#### Option B: Document in README
Instruct consumers to add to their Tailwind config or CSS.

---

### Phase 4: Testing & Validation

1. Build the library: `npm run build:lib`
2. In example: `npm install`
3. Run example: `cd example && npm run dev`
4. Verify all components render correctly
5. Verify CSS/styles load properly

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/index.ts` | CREATE - Main entry point with exports |
| `src/styles.css` | CREATE - Theme CSS variables |
| `tsup.config.ts` | CREATE - Build configuration |
| `package.json` | MODIFY - Add library fields, peer deps, build script |
| `example/package.json` | MODIFY - Add `aomi-ui` as file dependency |
| `example/tsconfig.json` | MODIFY - Remove `../src` path alias |
| `example/app/page.tsx` | MODIFY - Import from `aomi-ui` |
| `example/app/layout.tsx` | MODIFY - Import from `aomi-ui` |
| `example/app/globals.css` | MODIFY - Import library styles |
| `example/next.config.ts` | MODIFY - Remove webpack aliases |

---

## Open Questions

1. **Library name**: Use `aomi-ui` or keep `assistant-ui-starter`?
2. **Wallet integration**: Should wallet providers be part of core or separate export?
3. **CSS bundling**: Bundle all Tailwind utilities or just CSS variables?
4. **Monorepo**: Consider using pnpm workspaces for better dev experience?

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind classes not generated | Document `@source` requirement for consumers |
| Peer dependency version conflicts | Use wide version ranges in peerDependencies |
| Build errors from Next.js imports | Mark `next` as external, make imports conditional |
| CSS variable conflicts | Namespace variables (e.g., `--aomi-*`) |

---

## Success Criteria

- [ ] `npm run build:lib` produces `dist/` with JS, types, and CSS
- [ ] Example app imports from `aomi-ui` package name (not `../src`)
- [ ] Example app renders identically to root app
- [ ] No TypeScript errors in example
- [ ] Library can be published to npm
