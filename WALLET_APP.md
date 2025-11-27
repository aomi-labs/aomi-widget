# Wallet Integration Plan

## Problem
`useAppKit` hooks fail during SSR with error:
```
Please call createAppKit before using useAppKit hook
```

This happens because:
1. Next.js renders components on server first
2. Hooks like `useAppKit()` in `WalletFooter` run during SSR
3. `createAppKit()` hasn't been called yet on server

## Current Architecture

### Library (`@aomi-labs/widget-lib`)
- `wallet-providers.tsx` exports `initializeAppKit()` helper with SSR guard
- `wallet-footer.tsx` uses zustand store `useWalletButtonState` for wallet state
- `WalletFooter` still calls `useAppKit()` directly for `open()` function

### Consumer (`example/src/components/wallet-providers.tsx`)
```tsx
import { initializeAppKit } from "@aomi-labs/widget-lib"
import { appKitProviderConfig } from "@/components/config"

initializeAppKit(appKitProviderConfig)  // Module-level call

function ContextProvider({ children }) {
  return (
    <AppKitProvider {...appKitProviderConfig}>
      <WagmiProvider>...</WagmiProvider>
    </AppKitProvider>
  )
}
```

## Why It's Still Not Working

The `initializeAppKit()` has an SSR guard:
```tsx
export const initializeAppKit = (config) => {
  if (typeof window === 'undefined') return  // ← Returns early on server!
  createAppKit(config)
}
```

**The paradox:**
- We skip `createAppKit()` on server to avoid SSR issues
- But `useAppKit()` in `WalletFooter` still runs during SSR
- Hook expects `createAppKit` to have been called → error

## Potential Solutions

### Option A: Make WalletFooter client-only
Use `next/dynamic` with `ssr: false` for `WalletFooter`
- **Pro**: Hooks never run on server
- **Con**: User doesn't want dynamic imports

### Option B: Conditional hook usage
```tsx
// In WalletFooter
const appKit = typeof window !== 'undefined' ? useAppKit() : null;
```
- **Con**: Breaks React rules of hooks

### Option C: Split open() to a separate client component
Keep wallet state in zustand, isolate hook usage to a tiny client-only wrapper

### Option D: Check if AppKit can handle uninitialized state
Some libraries return safe defaults when not initialized - need to verify AppKit behavior

## Status
- [x] Created `initializeAppKit` helper
- [x] Created zustand store for wallet state
- [x] Fixed syntax error (nested useEffect)
- [ ] Resolve the SSR hook timing issue
