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

---

# Wallet Module Refactoring Plan (Option B)

## Goal
Move wallet **components** (that use hooks) to the example app while keeping **utilities** in the library. This follows the pattern used by libraries like RainbowKit which exports wallet connectors from a separate subpath (`@rainbow-me/rainbowkit/wallets`).

## Current Problem (SSR)
- `WalletFooter` calls `useAppKit()` which runs during SSR
- `initializeAppKit()` has SSR guard that skips on server
- Hook expects `createAppKit` to have been called → error

## Research Findings

### Industry Patterns

**RainbowKit Architecture** ([GitHub](https://github.com/rainbow-me/rainbowkit)):
- Peer dependencies: `@tanstack/react-query`, `react`, `viem`, `wagmi`
- Exports via subpaths: `./` (main), `./styles.css`, `./wallets`
- Uses `sideEffects: false` for tree-shaking

**Reown AppKit SSR Best Practices** ([Docs](https://docs.reown.com/appkit/react/core/installation)):
- Set `ssr: true` in WagmiAdapter
- Use `cookieStorage` for persistence
- Use `'use client'` directive for client components
- Wrap problematic components with client-side only wrapper or use dynamic imports with `{ ssr: false }`

**Optional Peer Dependencies Pattern** ([Stack Overflow](https://stackoverflow.com/questions/68452138/how-to-make-optional-peer-dependencies-truly-optional)):
- Use `peerDependenciesMeta` to mark as optional
- Dynamic imports for graceful fallback
- Separate entry points for optional features

**Tree-Shakeable Libraries** ([DEV.to](https://dev.to/lukasbombach/how-to-write-a-tree-shakable-component-library-4ied)):
- Set `sideEffects: false` in package.json
- Split into multiple entry points
- Works on file boundaries

## Solution: Keep Utilities Only

### What Stays in Library (`@aomi-labs/widget-lib`)

**Pure utilities (no hooks, no SSR issues):**
```
src/utils/wallet.ts
├── formatAddress()        - Pure function
├── getNetworkName()       - Pure function
├── useWalletButtonState   - Zustand store (client-safe)
└── Network re-exports     - Re-exports from @reown/appkit/networks
```

### What Moves to Example App

**Components using AppKit hooks:**
```
example/src/components/wallet/
├── wallet-footer.tsx           - Uses useAppKit()
├── wallet-system-messenger.tsx - Uses useAppKitAccount(), useAppKitNetwork()
└── index.ts                    - Re-exports
```

**Provider setup (already there):**
```
example/src/components/
├── config.tsx              - AppKit & Wagmi config
└── wallet-providers.tsx    - ContextProvider + initializeAppKit
```

### Library Changes

1. **Create `src/utils/wallet.ts`:**
   ```ts
   import { create } from 'zustand/react';

   // Re-exports
   export { mainnet, arbitrum, optimism, base, polygon } from '@reown/appkit/networks';

   // Pure utilities
   export const formatAddress = (addr?: string): string =>
     addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

   export const getNetworkName = (chainId: number | string): string => {
     const id = typeof chainId === "string" ? Number(chainId) : chainId;
     switch (id) {
       case 1: return 'ethereum';
       case 137: return 'polygon';
       case 42161: return 'arbitrum';
       case 8453: return 'base';
       case 10: return 'optimism';
       case 11155111: return 'sepolia';
       case 59140: return 'linea-sepolia';
       case 59144: return 'linea';
       default: return 'testnet';
     }
   };

   // Zustand store (no AppKit dependency)
   type WalletButtonState = {
     address?: string;
     chainId?: number;
     isConnected: boolean;
     ensName?: string;
   };

   type WalletActions = {
     setWallet: (data: Partial<WalletButtonState>) => void;
   };

   export const useWalletButtonState = create<WalletButtonState & WalletActions>((set) => ({
     address: undefined,
     chainId: undefined,
     isConnected: false,
     ensName: undefined,
     setWallet: (data) => set((prev) => ({ ...prev, ...data })),
   }));
   ```

2. **Delete `src/components/wallet-providers.tsx`** entirely

3. **Delete `src/components/assistant-ui/wallet-footer.tsx`** entirely

4. **Update `src/components/assistant-ui/base-sidebar.tsx`:**
   - Remove `WalletFooter` from sidebar footer
   - Add optional `footer` slot prop for consumers

5. **Update `src/index.ts` exports:**
   ```ts
   // Remove:
   export { WalletFooter } from './components/assistant-ui/wallet-footer';
   export { WalletSystemMessenger, initializeAppKit } from './components/wallet-providers';

   // Add:
   export {
     formatAddress,
     getNetworkName,
     useWalletButtonState,
     mainnet, arbitrum, optimism, base, polygon
   } from './utils/wallet';
   ```

6. **Update `package.json` peer dependencies:**
   ```json
   {
     "peerDependencies": {
       // REMOVE these (no longer needed):
       // "@reown/appkit": "^1.0.0",
       // "@reown/appkit-adapter-wagmi": "^1.0.0",
       // "wagmi": "^2.0.0",
       // "viem": "^2.0.0"

       // KEEP zustand
       "zustand": "^5.0.0"
     },
     "peerDependenciesMeta": {
       "@reown/appkit": { "optional": true }
     }
   }
   ```

### Example App Changes

1. **Create `example/src/components/wallet/wallet-footer.tsx`:**
   ```tsx
   "use client";
   import { useAppKit } from "@reown/appkit/react";
   import { Button } from "@aomi-labs/widget-lib";
   import { formatAddress, getNetworkName, useWalletButtonState } from "@aomi-labs/widget-lib";

   export function WalletFooter() {
     const { address, chainId, isConnected, ensName } = useWalletButtonState();
     const { open } = useAppKit();

     // ... rest of implementation
   }
   ```

2. **Create `example/src/components/wallet/wallet-system-messenger.tsx`:**
   ```tsx
   "use client";
   import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
   import { useEnsName } from "wagmi";
   import { useRuntimeActions, getNetworkName, useWalletButtonState } from "@aomi-labs/widget-lib";

   export function WalletSystemMessenger() {
     // ... implementation moved from library
   }
   ```

3. **Update example app layout to use footer slot:**
   ```tsx
   import { AomiFrame } from "@aomi-labs/widget-lib";
   import { WalletFooter } from "@/components/wallet/wallet-footer";
   import { WalletSystemMessenger } from "@/components/wallet/wallet-system-messenger";

   <AomiFrame sidebarFooter={<WalletFooter />}>
     <WalletSystemMessenger />
   </AomiFrame>
   ```

### File Structure After Refactor

```
src/
├── utils/
│   └── wallet.ts              # Pure utilities + zustand store
├── components/
│   └── assistant-ui/
│       └── base-sidebar.tsx   # Updated with footer slot
└── index.ts                   # Updated exports

example/src/components/
├── config.tsx                 # AppKit config (unchanged)
├── wallet-providers.tsx       # ContextProvider + initializeAppKit
└── wallet/
    ├── wallet-footer.tsx      # UI component (moved from lib)
    ├── wallet-system-messenger.tsx  # System message component (moved from lib)
    └── index.ts               # Re-exports
```

## Benefits

1. **No SSR issues in library** - All hook-using components are in consumer apps
2. **Clean separation** - Library provides utilities, apps provide integration
3. **Follows industry patterns** - Similar to RainbowKit's subpath exports
4. **Tree-shakeable** - Consumers who don't use wallet features don't bundle wallet code
5. **Consumer control** - Apps decide their own wallet provider setup
6. **Optional wallet support** - Library works without wallet deps installed

## Implementation Steps

1. [ ] Create `src/utils/wallet.ts` with utilities + store
2. [ ] Update `base-sidebar.tsx` to accept optional `footer` prop
3. [ ] Delete `wallet-footer.tsx` from library
4. [ ] Delete `wallet-providers.tsx` from library (or keep only network re-exports)
5. [ ] Update `src/index.ts` exports
6. [ ] Update library `package.json` - remove wallet peer deps
7. [ ] Create `example/src/components/wallet/` directory
8. [ ] Move wallet components to example app
9. [ ] Update example app to pass footer slot
10. [ ] Rebuild library
11. [ ] Test example app

## Sources

- [Reown AppKit Installation](https://docs.reown.com/appkit/react/core/installation) - SSR configuration
- [RainbowKit GitHub](https://github.com/rainbow-me/rainbowkit) - Subpath exports pattern
- [How to make optional peer dependencies truly optional](https://stackoverflow.com/questions/68452138/how-to-make-optional-peer-dependencies-truly-optional)
- [Tree Shaking in React component libraries](https://dev.to/lukasbombach/how-to-write-a-tree-shakable-component-library-4ied)
- [wagmi Getting Started](https://wagmi.sh/react/getting-started)
