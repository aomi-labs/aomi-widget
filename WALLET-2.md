# Wallet Refactoring Plan (v2)

## Goal

Refactor wallet integration to use **render props pattern** with **plain React state** (no Zustand). The lib handles all backend communication; the app only syncs wallet state.

---

## Architecture Overview

```
                              Lib (AomiFrame)
                             ┌─────────────────────────────────────┐
                             │                                     │
                             │  useState (wallet state)            │
                             │       │                             │
                             │       ├──▶ WalletSystemMessageEmitter
                             │       │         │                   │
                             │       │         ▼                   │
                             │       │    sendSystemMessage()      │
                             │       │         │                   │
                             │       │         ▼                   │
                             │       │      Backend                │
                             │       │                             │
                             │       └──▶ walletFooter({ wallet, setWallet })
                             │                 │                   │
                             └─────────────────┼───────────────────┘
                                               │
                                               ▼
                              App (WalletFooter)
                             ┌─────────────────────────────────────┐
                             │                                     │
                             │  useAppKitAccount() ─┐              │
                             │  useAppKitNetwork() ─┼─▶ setWallet()│
                             │  useEnsName() ───────┘              │
                             │                                     │
                             │  Render UI using `wallet` prop      │
                             │                                     │
                             └─────────────────────────────────────┘
```

---

## API Design

### Types

```tsx
// src/utils/wallet.ts
export type WalletButtonState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

export type WalletFooterProps = {
  wallet: WalletButtonState;
  setWallet: (data: Partial<WalletButtonState>) => void;
};
```

### AomiFrameProps

```tsx
// src/components/aomi-frame.tsx
type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Render prop for wallet footer - receives wallet state and setter from lib */
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
};
```

---

## Implementation Details

### 1. `src/utils/wallet.ts`

Remove Zustand. Export types and `WalletSystemMessageEmitter` component.

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRuntimeActions } from "@/components/assistant-ui/runtime";

// ============================================
// Types
// ============================================

export type WalletButtonState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

export type WalletFooterProps = {
  wallet: WalletButtonState;
  setWallet: (data: Partial<WalletButtonState>) => void;
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get network name from chainId
 */
export const getNetworkName = (chainId: number | string): string => {
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};

/**
 * Format wallet address for display (0x1234...5678)
 */
export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

// ============================================
// WalletSystemMessageEmitter
// ============================================

type WalletSystemMessageEmitterProps = {
  wallet: WalletButtonState;
};

/**
 * Internal component that watches wallet state and sends system messages
 * to the backend when wallet connects, disconnects, or switches networks.
 */
export function WalletSystemMessageEmitter({ wallet }: WalletSystemMessageEmitterProps) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  useEffect(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address?.toLowerCase();

    // Handle connect
    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      (!prev.isConnected || prev.address !== normalizedAddress)
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
      return;
    }

    // Handle disconnect
    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
      return;
    }

    // Handle network switch
    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      prev.isConnected &&
      prev.address === normalizedAddress &&
      prev.chainId !== chainId
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage]);

  return null;
}
```

### 2. `src/components/aomi-frame.tsx`

Update to use local React state and render prop pattern.

```tsx
"use client";

import { useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { AomiRuntimeProvider } from "@/components/assistant-ui/runtime";
import { ThreadContextProvider } from "@/lib/thread-context";
import {
  WalletSystemMessageEmitter,
  type WalletButtonState,
  type WalletFooterProps,
} from "@/utils/wallet";

type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Render prop for wallet footer - receives wallet state and setter from lib */
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
};

export const AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  walletFooter,
  children,
}: AomiFrameProps) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  const frameStyle: CSSProperties = { width, height, ...style };

  // Local wallet state (replaces Zustand)
  const [wallet, setWalletState] = useState<WalletButtonState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
    ensName: undefined,
  });

  const setWallet = useCallback((data: Partial<WalletButtonState>) => {
    setWalletState((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <ThreadContextProvider>
      <AomiRuntimeProvider backendUrl={backendUrl} publicKey={wallet.address}>
        {/* Internal: watches wallet state and sends system messages */}
        <WalletSystemMessageEmitter wallet={wallet} />
        {children}
        <SidebarProvider>
          <div
            className={cn(
              "flex h-full w-full overflow-hidden rounded-2xl border border-neutral-800 bg-white shadow-2xl dark:bg-neutral-950",
              className
            )}
            style={frameStyle}
          >
            <ThreadListSidebar footer={walletFooter?.({ wallet, setWallet })} />
            <SidebarInset className="relative">
              <header className="flex h-14 mt-1 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      Your First Conversation
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </BreadcrumbList>
                </Breadcrumb>
              </header>
              <div className="flex-1 overflow-hidden">
                <Thread />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AomiRuntimeProvider>
    </ThreadContextProvider>
  );
};
```

### 3. `src/components/assistant-ui/threadlist-sidebar.tsx`

Update footer prop type (now receives ReactNode from render prop result).

```tsx
type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Footer content (rendered result from walletFooter render prop) */
  footer?: React.ReactNode;
};
```

No change needed — it already accepts `ReactNode`.

### 4. `src/index.ts`

Update exports:

```tsx
// Remove: export { useWalletButtonState } from "./utils/wallet";
// Add:
export type { WalletButtonState, WalletFooterProps } from "./utils/wallet";
export { formatAddress, getNetworkName } from "./utils/wallet";
```

---

## App-Side Changes

### `example/src/components/wallet/wallet-footer.tsx`

Refactor to receive props from render prop:

```tsx
"use client";

import { useEffect } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import {
  Button,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  formatAddress,
  getNetworkName,
  type WalletFooterProps,
} from "@aomi-labs/widget-lib";

export function WalletFooter({ wallet, setWallet }: WalletFooterProps) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { open } = useAppKit();

  // Sync AppKit state → lib
  useEffect(() => {
    const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;
    setWallet({
      address,
      chainId: numericChainId,
      isConnected,
      ensName: ensName ?? undefined,
    });
  }, [address, chainId, isConnected, ensName, setWallet]);

  const networkName = getNetworkName(wallet.chainId as number);

  const handleClick = () => {
    if (wallet.isConnected) {
      void open({ view: "Account" });
    } else {
      void open({ view: "Connect" });
    }
  };

  const label = wallet.isConnected
    ? wallet.ensName ?? formatAddress(wallet.address)
    : "Connect Wallet";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Button
            className="w-full justify-center rounded-full text-white shadow-lg hover:bg-[var(--muted-foreground)] hover:text-white"
            onClick={handleClick}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{label}</span>
              {networkName ? (
                <span className="text-[11px] text-white/80">• {networkName}</span>
              ) : null}
            </div>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

### `example/app/page.tsx`

Update to use render prop:

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";
import { WalletFooter } from "@/components/wallet";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <AomiFrame
        height="720px"
        width="1200px"
        walletFooter={(props) => <WalletFooter {...props} />}
      />
    </main>
  );
}
```

### Delete

- `example/src/components/wallet/messenger.tsx` — no longer needed

---

## Files Changed

| File | Action |
|------|--------|
| `src/utils/wallet.ts` | Replace Zustand with types + `WalletSystemMessageEmitter` |
| `src/components/aomi-frame.tsx` | Add local state, render prop, remove `sidebar` prop |
| `src/index.ts` | Update exports (remove hook, add types) |
| `example/src/components/wallet/wallet-footer.tsx` | Refactor to use render prop args |
| `example/src/components/wallet/messenger.tsx` | Delete |
| `example/app/page.tsx` | Update to render prop syntax |

---

## SSR Considerations

| Component | SSR Safe? |
|-----------|-----------|
| `useState` in AomiFrame | Yes — initial state is `{ isConnected: false, ... }` |
| `WalletSystemMessageEmitter` | Yes — renders `null`, effect runs client-side only |
| `walletFooter` render prop | Yes — receives empty wallet state on server |
| AppKit hooks in WalletFooter | Client-only — but component is "use client" |

On server render:
- `wallet.isConnected = false`
- Footer shows "Connect Wallet"
- No hydration mismatch

---

## Benefits

1. **No external dependencies** — Removed Zustand
2. **Cleaner API boundary** — App doesn't import internal hooks
3. **Explicit data flow** — Render props make data flow visible
4. **Lib owns backend communication** — App never calls `sendSystemMessage`
5. **Follows headless orchestrator pattern** — Lib controls logic, app controls UI
