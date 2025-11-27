# Wallet Integration Plan

## Problem
`useAppKit` hooks fail during SSR because `createAppKit` hasn't been called yet.

## Solution: Module-Level Initialization

### Initialization Flow
```
1. example/src/components/wallet-providers.tsx loads
   ↓
2. createAppKit() called at MODULE LEVEL (outside components)
   ↓
3. WagmiProvider + QueryClientProvider wrap app
   ↓
4. Library's WalletFooter can now safely use useAppKit hooks
```

### Files to Modify

**example/src/components/wallet-providers.tsx**
- Remove `AppKitProvider` wrapper
- Add `createAppKit()` call at module level (after wagmiAdapter setup)
- Keep `WagmiProvider` and `QueryClientProvider` in the component

### Key Pattern
```tsx
// Module level - runs on import, before any component renders
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  // ...other config
})

// Component just wraps with Wagmi/Query providers
function ContextProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Why This Works
- `createAppKit` runs when module is imported (layout.tsx imports it)
- This happens before any components render
- By the time `WalletFooter` mounts, AppKit is already initialized
