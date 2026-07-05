# Multi-wallet per-family connection + hybrid picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-family multi-account wallet registry (one active EVM + one active Solana account, switchable) to the Para auth adapter, fix the SOL→EVM display loss + Para-re-popup + persistence bugs, and surface it through a ported, polished picker modal.

**Architecture:** The adapter (`providers/para.tsx`) derives an `accounts: AomiAccount[]` registry from wagmi `useConnections()` (EVM) + the Solana wallet-adapter (single-active), tagging each account `evm`/`solana`. Pure helpers (`accounts.ts`, `persistence.ts`) hold the testable logic. The picker modal (ported from `origin/multiple-wallet-providers`) renders provider rows on top and two family sections below, with the inactive family greyed. Backend contract is unchanged — `identity.address`/`svmAddress` stay as "active per family".

**Tech Stack:** React 19, TypeScript, wagmi v2, `@solana/wallet-adapter-react`, `@getpara/react-sdk`, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-05-29-multiwallet-per-family-picker-design.md`

**Test command (all tasks):** from repo root, `cd apps/registry && npx vitest run <relative-path>`. Lint: `pnpm lint`. Lib build: `pnpm run build:lib`.

**Planning refinement vs spec:** the spec lists persisting `activeAccountId` per family. During planning we determined wagmi (its own storage + reconnect) and the Solana wallet-adapter (autoConnect of last wallet) already persist and restore the active connection. Re-applying our own `activeAccountId` on mount would fight those libraries. So persistence here covers **selection state only** (`selectedFamily`, `selectedEvmChainId`, `selectedSolanaNetworkId`) — the genuine gap — and active-account restoration is delegated to the underlying libs. This is the only deviation from the spec.

---

## File structure

| File                                                                 | Responsibility                                                               | Action                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `apps/registry/src/lib/aomi-auth-adapter/types.ts`                   | `AomiAccount` type + adapter interface additions                             | Modify                     |
| `apps/registry/src/lib/aomi-auth-adapter/accounts.ts`                | Pure helpers: `buildAccounts`, `isAccountSelectable`                         | Create                     |
| `apps/registry/src/lib/aomi-auth-adapter/accounts.test.ts`           | Unit tests for account helpers                                               | Create                     |
| `apps/registry/src/lib/aomi-auth-adapter/persistence.ts`             | localStorage read/write for wallet preferences                               | Create                     |
| `apps/registry/src/lib/aomi-auth-adapter/persistence.test.ts`        | Unit tests for persistence                                                   | Create                     |
| `apps/registry/src/lib/aomi-auth-adapter/network-preferences.tsx`    | Add persistence + `storageKey` prop                                          | Modify                     |
| `apps/registry/src/lib/aomi-auth-adapter/safe-wagmi-hooks.ts`        | Add `useSafeConnections`, `useSafeSwitchAccount`                             | Modify                     |
| `apps/registry/src/lib/aomi-auth-adapter/context.tsx`                | Default `accounts`/`selectAccount` on disconnected adapter                   | Modify                     |
| `apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx`         | Build `accounts`, `selectAccount`, per-account disconnect, EVM-connect guard | Modify                     |
| `apps/registry/src/components/control-bar/wallet-picker-context.tsx` | Picker open/close state + provider list                                      | Create (ported)            |
| `apps/registry/src/components/control-bar/wallet-picker.tsx`         | Picker modal: provider rows + family sections                                | Create (ported + extended) |
| `apps/registry/src/components/control-bar/wallet-picker.test.tsx`    | Picker component test                                                        | Create                     |
| `apps/registry/src/components/control-bar/dual-wallet-bar.tsx`       | Becomes the trigger that opens the picker                                    | Modify                     |
| `apps/registry/src/lib/aomi-auth-adapter/index.ts`                   | Export new modules                                                           | Modify                     |

`wallet-family-slot.tsx` is deleted in Task 9 once the picker covers its role.

---

## Task 1: `AomiAccount` type + account helpers

**Files:**

- Modify: `apps/registry/src/lib/aomi-auth-adapter/types.ts`
- Create: `apps/registry/src/lib/aomi-auth-adapter/accounts.ts`
- Test: `apps/registry/src/lib/aomi-auth-adapter/accounts.test.ts`

- [ ] **Step 1: Add the `AomiAccount` type and adapter fields to `types.ts`**

In `types.ts`, after the `SolanaWalletDescriptor` type block, add:

```ts
/**
 * One wallet account known to the adapter, tagged by family. The registry
 * may hold several per family (e.g. MetaMask + Para-embedded EVM), but only
 * one per family is `active` (the live account reported to the backend).
 */
export type AomiAccount = {
  /** Stable id: wagmi connector uid (EVM) or solana wallet name (Solana). */
  id: string;
  family: WalletFamily;
  address: string;
  /** Short display label, e.g. formatted address. */
  label?: string;
  /** Human wallet name, e.g. "MetaMask", "Phantom", "Para". */
  walletName?: string;
  /** True when this is the live account for its family. */
  active: boolean;
};
```

Then inside the `AomiAuthAdapter` type, add these members (next to `solanaWallets`):

```ts
  /** All wallet accounts known to the adapter, tagged by family. */
  accounts: readonly AomiAccount[];
  /** Make `accounts[id]` the active account for its family. */
  selectAccount: (id: string) => Promise<void>;
```

And change the existing `disconnect` signature to add a per-account option:

```ts
  disconnect?: (options?: {
    family?: WalletFamily | "all";
    /** Disconnect a single account by `AomiAccount.id` (EVM only). */
    accountId?: string;
  }) => Promise<void>;
```

- [ ] **Step 2: Write the failing test**

Create `apps/registry/src/lib/aomi-auth-adapter/accounts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildAccounts, isAccountSelectable } from "./accounts";

describe("buildAccounts", () => {
  it("tags EVM connections and marks the active one", () => {
    const accounts = buildAccounts({
      evmConnections: [
        { id: "mm", walletName: "MetaMask", address: "0xAAA", chainId: 1 },
        { id: "rb", walletName: "Rabby", address: "0xBBB", chainId: 1 },
      ],
      activeEvmAddress: "0xbbb",
      solana: undefined,
    });
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toMatchObject({
      family: "evm",
      walletName: "MetaMask",
      active: false,
    });
    expect(accounts[1]).toMatchObject({
      family: "evm",
      walletName: "Rabby",
      active: true,
    });
  });

  it("adds the connected Solana wallet as a single active account", () => {
    const accounts = buildAccounts({
      evmConnections: [],
      activeEvmAddress: undefined,
      solana: { publicKey: "9xQpub", walletName: "Phantom" },
    });
    expect(accounts).toEqual([
      expect.objectContaining({
        family: "solana",
        address: "9xQpub",
        walletName: "Phantom",
        active: true,
      }),
    ]);
  });

  it("returns both families for a dual connection", () => {
    const accounts = buildAccounts({
      evmConnections: [
        { id: "mm", walletName: "MetaMask", address: "0xAAA", chainId: 1 },
      ],
      activeEvmAddress: "0xAAA",
      solana: { publicKey: "9xQpub", walletName: "Phantom" },
    });
    expect(accounts.filter((a) => a.family === "evm")).toHaveLength(1);
    expect(accounts.filter((a) => a.family === "solana")).toHaveLength(1);
  });

  it("returns empty when nothing is connected", () => {
    expect(
      buildAccounts({
        evmConnections: [],
        activeEvmAddress: undefined,
        solana: undefined,
      }),
    ).toEqual([]);
  });
});

describe("isAccountSelectable", () => {
  it("only allows accounts in the active family", () => {
    const evm = {
      id: "x",
      family: "evm",
      address: "0x",
      active: false,
    } as const;
    expect(isAccountSelectable(evm, "evm")).toBe(true);
    expect(isAccountSelectable(evm, "solana")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/accounts.test.ts`
Expected: FAIL — cannot find module `./accounts`.

- [ ] **Step 4: Write minimal implementation**

Create `apps/registry/src/lib/aomi-auth-adapter/accounts.ts`:

```ts
import { formatAddress } from "./identity";
import type { AomiAccount, WalletFamily } from "./types";

export type EvmConnectionInput = {
  id: string;
  walletName: string;
  address: string;
  chainId?: number;
};

export function buildAccounts(input: {
  evmConnections: readonly EvmConnectionInput[];
  activeEvmAddress?: string;
  solana?: { publicKey?: string; walletName?: string };
}): AomiAccount[] {
  const accounts: AomiAccount[] = [];
  const active = input.activeEvmAddress?.toLowerCase();

  for (const conn of input.evmConnections) {
    accounts.push({
      id: conn.id,
      family: "evm",
      address: conn.address,
      label: formatAddress(conn.address),
      walletName: conn.walletName,
      active: !!active && conn.address.toLowerCase() === active,
    });
  }

  if (input.solana?.publicKey) {
    accounts.push({
      id: input.solana.walletName ?? input.solana.publicKey,
      family: "solana",
      address: input.solana.publicKey,
      label: formatAddress(input.solana.publicKey),
      walletName: input.solana.walletName,
      active: true,
    });
  }

  return accounts;
}

export function isAccountSelectable(
  account: AomiAccount,
  activeFamily: WalletFamily,
): boolean {
  return account.family === activeFamily;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/accounts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/registry/src/lib/aomi-auth-adapter/types.ts \
  apps/registry/src/lib/aomi-auth-adapter/accounts.ts \
  apps/registry/src/lib/aomi-auth-adapter/accounts.test.ts
git commit -m "feat(adapter): add AomiAccount type and account-registry helpers"
```

---

## Task 2: Wallet preferences persistence helper

**Files:**

- Create: `apps/registry/src/lib/aomi-auth-adapter/persistence.ts`
- Test: `apps/registry/src/lib/aomi-auth-adapter/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/registry/src/lib/aomi-auth-adapter/persistence.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { loadWalletPreferences, saveWalletPreferences } from "./persistence";

afterEach(() => {
  globalThis.localStorage?.clear();
});

describe("wallet preferences persistence", () => {
  it("round-trips preferences", () => {
    saveWalletPreferences("para", {
      selectedFamily: "solana",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
    expect(loadWalletPreferences("para")).toEqual({
      selectedFamily: "solana",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
  });

  it("returns {} when nothing stored", () => {
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("returns {} on malformed JSON", () => {
    globalThis.localStorage.setItem(
      "aomi.wallet-preferences.para",
      "{not json",
    );
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("scopes by key", () => {
    saveWalletPreferences("para", { selectedFamily: "evm" });
    expect(loadWalletPreferences("privy")).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/persistence.test.ts`
Expected: FAIL — cannot find module `./persistence`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/registry/src/lib/aomi-auth-adapter/persistence.ts`:

```ts
import type { WalletFamily } from "./types";

export type WalletPreferences = {
  selectedFamily?: WalletFamily;
  selectedEvmChainId?: number;
  selectedSolanaNetworkId?: string;
};

const STORAGE_PREFIX = "aomi.wallet-preferences";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}.${key}`;
}

export function loadWalletPreferences(key: string): WalletPreferences {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(key));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as WalletPreferences;
  } catch {
    return {};
  }
}

export function saveWalletPreferences(
  key: string,
  prefs: WalletPreferences,
): void {
  try {
    globalThis.localStorage?.setItem(storageKey(key), JSON.stringify(prefs));
  } catch {
    // localStorage unavailable or over quota — preferences are best-effort.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/persistence.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/registry/src/lib/aomi-auth-adapter/persistence.ts \
  apps/registry/src/lib/aomi-auth-adapter/persistence.test.ts
git commit -m "feat(adapter): add wallet preferences persistence helper"
```

---

## Task 3: Wire persistence into network-preferences

**Files:**

- Modify: `apps/registry/src/lib/aomi-auth-adapter/network-preferences.tsx`
- Test: `apps/registry/src/lib/aomi-auth-adapter/network-preferences.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/registry/src/lib/aomi-auth-adapter/network-preferences.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { cleanup, render } from "@testing-library/react";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "./network-preferences";

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});

const evmChains = [
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://eth.example"] } },
  },
  {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://base.example"] } },
  },
] as const;

const solanaNetworks = [
  {
    id: "solana-mainnet",
    label: "Mainnet",
    cluster: "solana:mainnet",
    rpcHttpUrl: "https://m.example",
    isDefault: true,
  },
  {
    id: "solana-devnet",
    label: "Devnet",
    cluster: "solana:devnet",
    rpcHttpUrl: "https://d.example",
  },
] as const;

function Harness({
  onReady,
}: {
  onReady: (v: ReturnType<typeof useAomiWalletNetworkPreferences>) => void;
}) {
  const value = useAomiWalletNetworkPreferences();
  onReady(value);
  return null;
}

describe("network preferences persistence", () => {
  it("persists family + chain selections and restores them on remount", () => {
    let api!: ReturnType<typeof useAomiWalletNetworkPreferences>;
    const { unmount } = render(
      <AomiWalletNetworkPreferencesProvider
        storageKey="test"
        evmChains={evmChains}
        solanaNetworks={solanaNetworks}
      >
        <Harness onReady={(v) => (api = v)} />
      </AomiWalletNetworkPreferencesProvider>,
    );
    act(() => {
      api.setSelectedFamily("solana");
      api.setSelectedEvmChainId(8453);
    });
    unmount();

    let restored!: ReturnType<typeof useAomiWalletNetworkPreferences>;
    render(
      <AomiWalletNetworkPreferencesProvider
        storageKey="test"
        evmChains={evmChains}
        solanaNetworks={solanaNetworks}
      >
        <Harness onReady={(v) => (restored = v)} />
      </AomiWalletNetworkPreferencesProvider>,
    );
    expect(restored.selectedFamily).toBe("solana");
    expect(restored.selectedEvmChainId).toBe(8453);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/network-preferences.test.tsx`
Expected: FAIL — `storageKey` prop not accepted / selections not restored.

- [ ] **Step 3: Implement persistence in `network-preferences.tsx`**

Add the import at the top (after the existing imports):

```tsx
import { loadWalletPreferences, saveWalletPreferences } from "./persistence";
```

Change the provider props to accept an optional `storageKey`:

```tsx
export function AomiWalletNetworkPreferencesProvider({
  children,
  evmChains,
  solanaNetworks,
  storageKey = "default",
}: {
  children: ReactNode;
  evmChains: readonly Chain[];
  solanaNetworks: readonly SolanaNetworkOption[];
  storageKey?: string;
}) {
  const persisted = useMemo(
    () => loadWalletPreferences(storageKey),
    [storageKey],
  );
```

Update the three `useState` initializers to prefer persisted values (validated against the available chains/networks):

```tsx
const [selectedFamily, setSelectedFamily] = useState<WalletFamily>(
  () =>
    persisted.selectedFamily ?? resolveInitialFamily(evmChains, solanaNetworks),
);
const [selectedEvmChainId, setSelectedEvmChainId] = useState<
  number | undefined
>(() =>
  persisted.selectedEvmChainId !== undefined &&
  evmChains.some((chain) => chain.id === persisted.selectedEvmChainId)
    ? persisted.selectedEvmChainId
    : evmChains[0]?.id,
);
const [selectedSolanaNetworkId, setSelectedSolanaNetworkId] = useState<
  string | undefined
>(() =>
  persisted.selectedSolanaNetworkId &&
  solanaNetworks.some((n) => n.id === persisted.selectedSolanaNetworkId)
    ? persisted.selectedSolanaNetworkId
    : resolveSelectedSolanaNetwork(solanaNetworks)?.id,
);
```

Add a persistence effect after the existing effects (before the `selectedSolanaNetwork` memo):

```tsx
useEffect(() => {
  saveWalletPreferences(storageKey, {
    selectedFamily,
    selectedEvmChainId,
    selectedSolanaNetworkId,
  });
}, [storageKey, selectedFamily, selectedEvmChainId, selectedSolanaNetworkId]);
```

(`useEffect` is already imported in this file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/network-preferences.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Pass `storageKey` from the Para provider**

In `apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx`, find the `AomiWalletNetworkPreferencesProvider` usage at the bottom (`AomiParaProvider`) and add the prop:

```tsx
    <AomiWalletNetworkPreferencesProvider
      evmChains={props.networks ?? defaultNetworks}
      solanaNetworks={supportedSolanaNetworks}
      storageKey="para"
    >
```

- [ ] **Step 6: Verify the wider suite still passes + commit**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/`
Expected: PASS (all adapter tests).

```bash
git add apps/registry/src/lib/aomi-auth-adapter/network-preferences.tsx \
  apps/registry/src/lib/aomi-auth-adapter/network-preferences.test.tsx \
  apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx
git commit -m "feat(adapter): persist network/family selection to localStorage"
```

---

## Task 4: Safe wagmi multi-connection hooks

**Files:**

- Modify: `apps/registry/src/lib/aomi-auth-adapter/safe-wagmi-hooks.ts`

No new test — these are thin try/catch wrappers like the existing hooks in the file; they are exercised by Task 5 + the build.

- [ ] **Step 1: Add `useConnections` and `useSwitchAccount` to the wagmi import**

In `safe-wagmi-hooks.ts`, extend the `from "wagmi"` import list to include `useConnections` and `useSwitchAccount` (keep the others):

```ts
import {
  useAccount,
  useCapabilities,
  useConfig,
  useConnect,
  useConnections,
  useConnectors,
  useDisconnect,
  useSendCallsSync,
  useSendTransaction,
  useSignTypedData,
  useSwitchAccount,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
```

- [ ] **Step 2: Add the safe wrappers at the end of the file**

```ts
export type WagmiConnectionShape = {
  connectorId: string;
  connectorName: string;
  address: `0x${string}`;
  chainId?: number;
};

export function useSafeConnections(): WagmiConnectionShape[] {
  try {
    const connections = useConnections();
    return connections.flatMap((connection) =>
      connection.accounts.map((address) => ({
        connectorId: connection.connector.uid,
        connectorName: connection.connector.name,
        address,
        chainId: connection.chainId,
      })),
    );
  } catch {
    return [];
  }
}

export function useSafeSwitchAccount(): {
  switchAccountAsync?: (args: {
    connector: Parameters<
      ReturnType<typeof useSwitchAccount>["switchAccountAsync"]
    >[0]["connector"];
  }) => Promise<unknown>;
} {
  try {
    const { switchAccountAsync } = useSwitchAccount();
    return { switchAccountAsync };
  } catch {
    return { switchAccountAsync: undefined };
  }
}
```

- [ ] **Step 3: Confirm the disconnect wrapper accepts a connector**

`useSafeDisconnect` currently returns `disconnectAsync` from wagmi's `useDisconnect`. wagmi's `disconnectAsync` already accepts an optional `{ connector }` argument, so no change is needed — Task 5 will call `disconnectAsync({ connector })`. Verify by reading the existing `useSafeDisconnect` (lines ~187-197); leave it as-is.

- [ ] **Step 4: Type-check + commit**

Run: `cd apps/registry && npx tsc --noEmit -p tsconfig.json` (if a tsconfig exists; otherwise rely on the lib build in Task 9)
Expected: no new errors in `safe-wagmi-hooks.ts`.

```bash
git add apps/registry/src/lib/aomi-auth-adapter/safe-wagmi-hooks.ts
git commit -m "feat(adapter): add safe useConnections + useSwitchAccount wrappers"
```

---

## Task 5: Build `accounts` + `selectAccount` + per-account disconnect + connect guard in para.tsx

**Files:**

- Modify: `apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx`
- Modify: `apps/registry/src/lib/aomi-auth-adapter/context.tsx`

- [ ] **Step 1: Add defaults to the disconnected adapter in `context.tsx`**

In `context.tsx`, the `DISCONNECTED_ADAPTER` object must satisfy the new required fields. Add:

```ts
const DISCONNECTED_ADAPTER: AomiAuthAdapter = {
  identity: AOMI_AUTH_DISCONNECTED_IDENTITY,
  isReady: true,
  isSwitchingChain: false,
  canConnect: false,
  canOpenAccountUI: false,
  canDisconnect: false,
  accounts: [],
  selectAccount: async () => undefined,
  supportedNetworks: {
    evm: [],
    solana: [],
  },
  connect: async () => undefined,
};
```

- [ ] **Step 2: Import the helpers + new hooks in `para.tsx`**

Add to the existing safe-wagmi-hooks import block:

```ts
import {
  useSafeCapabilities,
  useSafeConnections,
  useSafeDisconnect,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignTypedData,
  useSafeSwitchAccount,
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
  useSafeWalletClient,
} from "../safe-wagmi-hooks";
import { buildAccounts } from "../accounts";
```

- [ ] **Step 3: Call the new hooks inside `AomiParaAdapterProvider`**

After the existing `const { disconnectAsync: wagmiDisconnectAsync } = useSafeDisconnect();` line, add:

```ts
const evmConnections = useSafeConnections();
const { switchAccountAsync } = useSafeSwitchAccount();
```

- [ ] **Step 4: Build the `accounts` registry inside the `adapter` useMemo**

Inside the `adapter` `useMemo` (after `address` is computed, before the `return`), add:

```ts
const accounts = buildAccounts({
  evmConnections: evmConnections.map((conn) => ({
    id: conn.connectorId,
    walletName: conn.connectorName,
    address: conn.address,
    chainId: conn.chainId,
  })),
  activeEvmAddress: address,
  solana: svmAddress
    ? { publicKey: svmAddress, walletName: solanaWallet.walletName }
    : undefined,
});
```

Then add `accounts` and `selectAccount` to the returned object (next to `solanaWallets`):

```ts
      accounts,
      selectAccount: async (id: string) => {
        const target = accounts.find((account) => account.id === id);
        if (!target) {
          throw new Error(`Unknown account: ${id}`);
        }
        if (target.family === "evm") {
          setSelectedFamily("evm");
          const connection = evmConnections.find(
            (conn) => conn.connectorId === id,
          );
          if (connection && switchAccountAsync) {
            const connector = wagmiConfig.connectors?.find(
              (c) => c.uid === connection.connectorId,
            );
            if (connector) {
              await switchAccountAsync({ connector });
            }
          }
          return;
        }
        // Solana is single-active; selecting it just focuses the family.
        // Switching to a different Solana wallet goes through
        // `connectSolanaWallet`.
        setSelectedFamily("solana");
      },
```

Note: `wagmiConfig` is `useSafeWagmiConfig()`. Its `connectors` field is not currently exposed by `WagmiConfigShape`. Update `useSafeWagmiConfig` in `safe-wagmi-hooks.ts` to also return `connectors`:

```ts
export type WagmiConfigShape = {
  chains: readonly Chain[];
  connectors: readonly { uid: string; name: string }[];
};

const DISCONNECTED_WAGMI_CONFIG: WagmiConfigShape = {
  chains: [],
  connectors: [],
};

export function useSafeWagmiConfig(): WagmiConfigShape {
  try {
    const config = useConfig();
    return {
      chains: config.chains ?? [],
      connectors: config.connectors ?? [],
    };
  } catch {
    return DISCONNECTED_WAGMI_CONFIG;
  }
}
```

(The `connector` passed to `switchAccountAsync` must be the full wagmi connector object. `config.connectors` returns full connector objects whose `uid`/`name` we read; pass the matched object directly — adjust the `WagmiConfigShape.connectors` element type to `Connector` from wagmi if the build complains, importing `import type { Connector } from "wagmi";`.)

- [ ] **Step 5: Add `evmConnections`, `switchAccountAsync`, `wagmiConfig` to the useMemo deps**

In the `adapter` `useMemo` dependency array, add `evmConnections`, `switchAccountAsync` (the deps array already includes `wagmiConfig.chains`; add `wagmiConfig.connectors` too).

- [ ] **Step 6: Implement the EVM-connect guard**

In the returned `connect` function, change the EVM path so it only opens the Para modal when there is no active EVM account. Replace the final `paraModal?.openModal({ step: "AUTH_MAIN" });` line of `connect` with:

```ts
if (requestedFamily === "evm" && address) {
  // Already have a live EVM account — do not re-open the Para modal.
  // Account management happens through the picker (select/disconnect)
  // or `openAccountUI`.
  return;
}
paraModal?.openModal({ step: "AUTH_MAIN" });
```

(`address` is in scope inside the memo and already a dep.)

- [ ] **Step 7: Implement per-account disconnect**

In the returned `disconnect` function, handle `options.accountId` first (EVM-only). Add at the top of the `disconnect` body, before the existing family logic:

```ts
if (options?.accountId) {
  const target = accounts.find((a) => a.id === options.accountId);
  if (target?.family === "evm" && wagmiDisconnectAsync) {
    const connector = wagmiConfig.connectors?.find((c) => c.uid === target.id);
    try {
      await wagmiDisconnectAsync(connector ? { connector } : undefined);
    } catch (error) {
      console.warn("[aomi-auth-adapter] EVM account disconnect failed", error);
    }
    return;
  }
}
```

- [ ] **Step 8: Build the library to type-check the changes**

Run: `pnpm run build:lib`
Expected: build succeeds with no type errors in `para.tsx`, `context.tsx`, `safe-wagmi-hooks.ts`.

- [ ] **Step 9: Run the adapter test suite**

Run: `cd apps/registry && npx vitest run src/lib/aomi-auth-adapter/`
Expected: PASS (existing + Task 1-3 tests).

- [ ] **Step 10: Commit**

```bash
git add apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx \
  apps/registry/src/lib/aomi-auth-adapter/context.tsx \
  apps/registry/src/lib/aomi-auth-adapter/safe-wagmi-hooks.ts
git commit -m "feat(adapter): account registry, selectAccount, per-account disconnect, EVM connect guard"
```

---

## Task 6: Port the wallet picker context

**Files:**

- Create: `apps/registry/src/components/control-bar/wallet-picker-context.tsx`

- [ ] **Step 1: Create the context (adapted from the remote branch)**

Create `apps/registry/src/components/control-bar/wallet-picker-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FC,
  type ReactNode,
  type SVGProps,
} from "react";
import { ParaIcon } from "@/components/icons";
import type { AomiAuthAdapter } from "../../lib/aomi-auth-adapter";

export type WalletPickerProvider = {
  id: string;
  label: string;
  description?: string;
  icon?: FC<SVGProps<SVGSVGElement>>;
  onSelect?: (adapter: AomiAuthAdapter) => void | Promise<void>;
  disabled?: boolean;
};

export type WalletPickerContextValue = {
  open: boolean;
  openPicker: () => void;
  closePicker: () => void;
  providers: WalletPickerProvider[];
};

const WalletPickerContext = createContext<WalletPickerContextValue | null>(
  null,
);

const DEFAULT_WALLET_PROVIDERS: WalletPickerProvider[] = [
  {
    id: "para",
    label: "Para",
    description: "Email, social, wallet",
    icon: ParaIcon,
  },
];

export function normalizeWalletProviderId(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("para")) return "para";
  return normalized;
}

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);

  const value = useMemo<WalletPickerContextValue>(
    () => ({
      open,
      openPicker,
      closePicker,
      providers: DEFAULT_WALLET_PROVIDERS,
    }),
    [open, openPicker, closePicker],
  );

  return (
    <WalletPickerContext.Provider value={value}>
      {children}
    </WalletPickerContext.Provider>
  );
}

export function useWalletPicker(): WalletPickerContextValue {
  const context = useContext(WalletPickerContext);
  if (!context) {
    throw new Error("useWalletPicker must be used within WalletPickerProvider");
  }
  return context;
}
```

Note: only Para is listed (Base/Privy placeholders are out of scope per the spec). `ParaIcon` is exported from `@/components/icons`.

- [ ] **Step 2: Type-check via lib build + commit**

Run: `pnpm run build:lib`
Expected: build succeeds.

```bash
git add apps/registry/src/components/control-bar/wallet-picker-context.tsx
git commit -m "feat(picker): add wallet picker context"
```

---

## Task 7: Build the picker modal (provider rows + family sections)

**Files:**

- Create: `apps/registry/src/components/control-bar/wallet-picker.tsx`
- Test: `apps/registry/src/components/control-bar/wallet-picker.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `apps/registry/src/components/control-bar/wallet-picker.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { AomiAuthAdapterProvider } from "@/lib/aomi-auth-adapter";
import { AomiWalletNetworkPreferencesProvider } from "@/lib/aomi-auth-adapter/network-preferences";
import { WalletPickerProvider } from "./wallet-picker-context";
import { WalletPicker } from "./wallet-picker";

afterEach(cleanup);

const evmChains = [
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://eth.example"] } },
  },
] as const;
const solanaNetworks = [
  {
    id: "solana-mainnet",
    label: "Mainnet",
    cluster: "solana:mainnet",
    rpcHttpUrl: "https://m.example",
    isDefault: true,
  },
] as const;

function makeAdapter(
  overrides: Partial<AomiAuthAdapter> = {},
): AomiAuthAdapter {
  return {
    identity: {
      status: "connected",
      isConnected: true,
      address: "0xAAAAAAAA",
      chainId: 1,
      svmAddress: "9xQpubKey",
      authProvider: "google",
      primaryLabel: "0xAAA..AA",
    },
    isReady: true,
    isSwitchingChain: false,
    canConnect: true,
    canOpenAccountUI: true,
    canDisconnect: true,
    accounts: [
      {
        id: "mm",
        family: "evm",
        address: "0xAAAAAAAA",
        walletName: "MetaMask",
        active: true,
      },
      {
        id: "phantom",
        family: "solana",
        address: "9xQpubKey",
        walletName: "Phantom",
        active: true,
      },
    ],
    selectAccount: vi.fn(async () => undefined),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    supportedNetworks: { evm: evmChains, solana: solanaNetworks },
    ...overrides,
  };
}

function renderPicker(adapter: AomiAuthAdapter) {
  return render(
    <AomiAuthAdapterProvider value={adapter}>
      <AomiWalletNetworkPreferencesProvider
        storageKey="test"
        evmChains={evmChains}
        solanaNetworks={solanaNetworks}
      >
        <WalletPickerProvider>
          <OpenAndRender />
        </WalletPickerProvider>
      </AomiWalletNetworkPreferencesProvider>
    </AomiAuthAdapterProvider>,
  );
}

import { useEffect } from "react";
import { useWalletPicker } from "./wallet-picker-context";
function OpenAndRender() {
  const { openPicker } = useWalletPicker();
  useEffect(() => {
    openPicker();
  }, [openPicker]);
  return <WalletPicker />;
}

describe("WalletPicker", () => {
  it("renders both family sections with their accounts", () => {
    renderPicker(makeAdapter());
    expect(screen.getByText(/EVM/i)).toBeTruthy();
    expect(screen.getByText(/Solana/i)).toBeTruthy();
    expect(screen.getByText("MetaMask")).toBeTruthy();
    expect(screen.getByText("Phantom")).toBeTruthy();
  });

  it("calls selectAccount when an account in the active family is clicked", () => {
    const adapter = makeAdapter();
    renderPicker(adapter);
    // active family defaults to evm; clicking the EVM account row selects it.
    fireEvent.click(screen.getByText("MetaMask"));
    expect(adapter.selectAccount).toHaveBeenCalledWith("mm");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/registry && npx vitest run src/components/control-bar/wallet-picker.test.tsx`
Expected: FAIL — cannot find module `./wallet-picker`.

- [ ] **Step 3: Implement `wallet-picker.tsx`**

Create `apps/registry/src/components/control-bar/wallet-picker.tsx`. This adapts the remote shell (header, overlay, animations, `ProviderRow` styling) and replaces the single provider list body with provider rows + two family sections.

```tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type SVGProps,
} from "react";
import {
  Loader2Icon,
  LogOutIcon,
  Settings2Icon,
  WalletIcon,
  XIcon,
  CheckIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter,
  formatAddress,
  formatAuthProvider,
} from "../../lib/aomi-auth-adapter";
import { isAccountSelectable } from "../../lib/aomi-auth-adapter/accounts";
import { useAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
import type {
  AomiAccount,
  WalletFamily,
} from "../../lib/aomi-auth-adapter/types";
import { useWalletPicker } from "./wallet-picker-context";

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "Solana" : "EVM";
}

export function WalletPicker() {
  const { open, closePicker } = useWalletPicker();
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const { selectedFamily, setSelectedFamily } =
    useAomiWalletNetworkPreferences();
  const activeFamily: WalletFamily = adapter.activeFamily ?? selectedFamily;
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPending(null);
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closePicker]);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<void> | void) => {
      setPending(key);
      try {
        await fn();
      } catch (err) {
        console.warn("[WalletPicker] action failed", key, err);
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const evmAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "evm"),
    [adapter.accounts],
  );
  const solanaAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "solana"),
    [adapter.accounts],
  );

  if (!open) return null;

  const providerLabel =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aomi-wallet-picker-title"
      className="animate-in fade-in-0 absolute inset-0 z-50 flex items-center justify-center px-4 py-4 duration-150"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closePicker}
        className="absolute inset-0 cursor-default bg-black/15 dark:bg-black/30"
      />
      <div
        className={cn(
          "relative z-10 flex w-full max-w-[360px] flex-col overflow-hidden",
          "border-border/60 bg-popover text-popover-foreground rounded-3xl border shadow-lg",
          "animate-in zoom-in-95 fade-in-0 duration-200",
        )}
      >
        <div className="border-border/60 relative border-b px-4 pb-3 pt-3">
          <h2
            id="aomi-wallet-picker-title"
            className="text-sm font-semibold tracking-tight"
          >
            Wallets
          </h2>
          <p className="text-muted-foreground mt-0.5 pr-7 text-xs leading-snug">
            {identity.isConnected
              ? (providerLabel ?? "Manage your connected wallets.")
              : "Connect an EVM or Solana wallet."}
          </p>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close"
            className={cn(
              "absolute right-3 top-3 rounded-full p-1 transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-3">
          <FamilySection
            family="evm"
            accounts={evmAccounts}
            activeFamily={activeFamily}
            chainId={identity.chainId}
            pending={pending}
            onSwitchFamily={() => setSelectedFamily("evm")}
            onSelect={(id) =>
              void runAction(`select:${id}`, () => adapter.selectAccount(id))
            }
            onDisconnect={(id) =>
              adapter.disconnect
                ? void runAction(`disconnect:${id}`, () =>
                    adapter.disconnect!({ accountId: id }),
                  )
                : undefined
            }
            onConnect={
              adapter.canConnect
                ? () =>
                    void runAction("connect:evm", async () => {
                      await adapter.connect({ family: "evm" });
                      closePicker();
                    })
                : undefined
            }
          />
          <FamilySection
            family="solana"
            accounts={solanaAccounts}
            activeFamily={activeFamily}
            pending={pending}
            onSwitchFamily={() => setSelectedFamily("solana")}
            onSelect={(id) =>
              void runAction(`select:${id}`, () => adapter.selectAccount(id))
            }
            onDisconnect={(id) =>
              adapter.disconnect
                ? void runAction(`disconnect:${id}`, () =>
                    adapter.disconnect!({ family: "solana" }),
                  )
                : undefined
            }
            onConnect={
              adapter.canConnect
                ? () =>
                    void runAction("connect:solana", async () => {
                      await adapter.connect({ family: "solana" });
                      closePicker();
                    })
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

type FamilySectionProps = {
  family: WalletFamily;
  accounts: readonly AomiAccount[];
  activeFamily: WalletFamily;
  chainId?: number;
  pending: string | null;
  onSwitchFamily: () => void;
  onSelect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect?: () => void;
};

function FamilySection({
  family,
  accounts,
  activeFamily,
  chainId,
  pending,
  onSwitchFamily,
  onSelect,
  onDisconnect,
  onConnect,
}: FamilySectionProps) {
  const isActiveFamily = family === activeFamily;
  return (
    <section
      className={cn("flex flex-col gap-1.5", !isActiveFamily && "opacity-60")}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {familyLabel(family)}
        </span>
        {!isActiveFamily && (
          <button
            type="button"
            onClick={onSwitchFamily}
            className="text-primary text-[11px] hover:underline"
          >
            Switch to {familyLabel(family)}
          </button>
        )}
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground px-1 text-[11px]">
          No {familyLabel(family)} wallet connected.
        </p>
      ) : (
        accounts.map((account) => {
          const selectable =
            isActiveFamily && isAccountSelectable(account, activeFamily);
          const chainLabel =
            family === "evm" && account.active && chainId
              ? getChainInfo(chainId)?.ticker
              : undefined;
          return (
            <div
              key={account.id}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-2.5 py-2",
                account.active
                  ? "border-primary/40 bg-primary/[0.04]"
                  : "border-border/60 bg-background",
              )}
            >
              <span className="bg-muted/40 text-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
                <WalletIcon className="size-4" />
              </span>
              <button
                type="button"
                disabled={!selectable || pending !== null || account.active}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "min-w-0 flex-1 text-left",
                  selectable && !account.active
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
              >
                <span className="block truncate text-sm font-medium">
                  {account.walletName ?? familyLabel(family)}
                </span>
                <span className="text-muted-foreground block truncate text-[11px]">
                  {[account.label ?? formatAddress(account.address), chainLabel]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
              </button>
              {account.active && (
                <CheckIcon className="text-primary size-4 shrink-0" />
              )}
              {!account.active &&
                selectable &&
                (pending === `select:${account.id}` ? (
                  <Loader2Icon className="size-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                ))}
              <RowIconButton
                icon={LogOutIcon}
                ariaLabel="Disconnect"
                disabled={pending !== null}
                loading={pending === `disconnect:${account.id}`}
                onClick={() => onDisconnect(account.id)}
              />
            </div>
          );
        })
      )}
      {isActiveFamily && onConnect && (
        <button
          type="button"
          onClick={onConnect}
          disabled={pending !== null}
          className={cn(
            "border-border text-muted-foreground flex items-center justify-center gap-2 rounded-2xl border border-dashed px-2.5 py-2 text-xs",
            "hover:bg-accent/40",
          )}
        >
          {pending === `connect:${family}` ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : null}
          Connect {familyLabel(family)} wallet
        </button>
      )}
    </section>
  );
}

function RowIconButton({
  icon: Icon,
  onClick,
  disabled,
  loading,
  ariaLabel,
}: {
  icon: FC<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {loading ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <Icon className="size-3.5" />
      )}
    </button>
  );
}
```

Note: `formatAddress` and `formatAuthProvider` are exported from `../../lib/aomi-auth-adapter` (via `identity.ts` re-export). `Settings2Icon` import can be dropped if unused — keep the import list matching what's referenced (remove `Settings2Icon` if the build flags it as unused under lint).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/registry && npx vitest run src/components/control-bar/wallet-picker.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/registry/src/components/control-bar/wallet-picker.tsx \
  apps/registry/src/components/control-bar/wallet-picker.test.tsx
git commit -m "feat(picker): wallet picker modal with per-family sections"
```

---

## Task 8: Wire the picker as the trigger from dual-wallet-bar

**Files:**

- Modify: `apps/registry/src/components/control-bar/dual-wallet-bar.tsx`

- [ ] **Step 1: Replace the popover body with a picker trigger**

Rewrite `dual-wallet-bar.tsx` so the collapsed button opens the picker modal instead of a popover of `WalletFamilySlot`s. The button keeps showing the active-family summary. Wrap the trigger + modal in `WalletPickerProvider` so the modal has context.

```tsx
"use client";

import { useEffect, useMemo, type FC } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { useAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
import { formatAddress } from "../../lib/aomi-auth-adapter/identity";
import { WalletPicker } from "./wallet-picker";
import { WalletPickerProvider, useWalletPicker } from "./wallet-picker-context";

export type DualWalletBarProps = {
  families: Array<"evm" | "solana">;
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
};

function solanaClusterLabel(cluster?: string): string | undefined {
  if (!cluster) return undefined;
  if (cluster === "solana:mainnet") return "Mainnet";
  if (cluster === "solana:devnet") return "Devnet";
  if (cluster === "solana:testnet") return "Testnet";
  return cluster.replace("solana:", "");
}

function familyLabel(family: "evm" | "solana"): string {
  return family === "solana" ? "Solana" : "EVM";
}

const DualWalletBarInner: FC<DualWalletBarProps> = ({
  families,
  className,
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const { selectedFamily } = useAomiWalletNetworkPreferences();
  const { openPicker } = useWalletPicker();

  const activeFamily: "evm" | "solana" = useMemo(() => {
    const preferred = adapter.activeFamily ?? selectedFamily;
    if (preferred && families.includes(preferred)) return preferred;
    return families[0] ?? "evm";
  }, [adapter.activeFamily, families, selectedFamily]);

  const connected =
    activeFamily === "evm" ? !!identity.address : !!identity.svmAddress;
  const addressLabel =
    activeFamily === "evm"
      ? formatAddress(identity.address)
      : formatAddress(identity.svmAddress);
  const networkLabel =
    activeFamily === "evm"
      ? identity.chainId
        ? (getChainInfo(identity.chainId)?.ticker ?? undefined)
        : undefined
      : solanaClusterLabel(identity.solanaCluster);
  const primaryLabel = connected
    ? addressLabel
    : `Connect ${familyLabel(activeFamily)}`;

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "inline-flex items-center justify-between gap-2 whitespace-nowrap text-sm font-medium",
          "w-full rounded-3xl px-5 py-2.5 transition-all duration-200",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          connected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground border-border hover:bg-muted/80 border border-dashed",
          className,
        )}
        aria-label="Manage wallets"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="max-w-[180px] truncate">{primaryLabel}</span>
          {connected && networkLabel && (
            <span className="opacity-50">{networkLabel}</span>
          )}
        </span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      <WalletPicker />
    </>
  );
};

export const DualWalletBar: FC<DualWalletBarProps> = (props) => {
  return (
    <WalletPickerProvider>
      <DualWalletBarInner {...props} />
    </WalletPickerProvider>
  );
};
```

Note: the picker modal renders with `absolute inset-0` — `DualWalletBar`'s nearest positioned ancestor (the control bar / frame) provides the containing block. This matches how the remote mounts it.

- [ ] **Step 2: Run the control-bar tests**

Run: `cd apps/registry && npx vitest run src/components/control-bar/`
Expected: PASS. If `network-select.test.tsx` imported `WalletFamilySlot` indirectly, confirm it still passes; it imports `ConnectButton`, which still renders `DualWalletBar` — should be unaffected.

- [ ] **Step 3: Commit**

```bash
git add apps/registry/src/components/control-bar/dual-wallet-bar.tsx
git commit -m "feat(picker): open wallet picker from the dual-wallet bar trigger"
```

---

## Task 9: Remove dead family-slot, full build, lint, demo verification

**Files:**

- Delete: `apps/registry/src/components/control-bar/wallet-family-slot.tsx`

- [ ] **Step 1: Confirm `wallet-family-slot.tsx` has no remaining importers**

Run: `grep -rn "wallet-family-slot\|WalletFamilySlot" apps/registry/src --include="*.tsx" --include="*.ts" | grep -v "wallet-family-slot.tsx"`
Expected: no output. If anything references it, fix those references first (they should already route through the picker).

- [ ] **Step 2: Delete the file**

```bash
git rm apps/registry/src/components/control-bar/wallet-family-slot.tsx
```

- [ ] **Step 3: Run the full registry test suite**

Run: `cd apps/registry && npx vitest run`
Expected: PASS (all suites).

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: clean (fix any unused-import warnings, e.g. a stray `Settings2Icon` in `wallet-picker.tsx`).

- [ ] **Step 5: Build the library**

Run: `pnpm run build:lib`
Expected: build succeeds, no type errors.

- [ ] **Step 6: Manual demo verification**

Run: `pnpm --filter landing dev` (requires `NEXT_PUBLIC_PARA_API_KEY`). In the browser at `localhost:3000`:

- Open the wallet bar → the picker modal shows EVM and Solana sections.
- Solana network/cluster defaults to **Mainnet**.
- Connect EVM via Para; while connected, the EVM section shows the account with select/disconnect and **does not** re-open the Para modal.
- Switch network family to Solana via NetworkSelect → EVM section greys out with a "Switch to EVM" affordance; the EVM account is still listed (not "lost").
- Reload the page → the last selected family/chain/Solana network is restored.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(picker): remove wallet-family-slot, superseded by picker sections"
```

---

## Self-review notes (addressed)

- **Spec coverage:** account registry (Task 1, 5), persistence (Task 2, 3), SOL→EVM display fix + EVM-connect guard + per-account disconnect (Task 5), hybrid picker with family sections + gating + switch-family affordance (Task 6, 7), trigger wiring (Task 8), tests (Task 1-3, 7), build/lint/demo (Task 9). Default-mainnet fix already landed this session.
- **Type consistency:** `AomiAccount`/`accounts`/`selectAccount`/`disconnect({accountId})` defined in Task 1, defaulted in Task 5 (`context.tsx`), consumed in Task 7/8. `buildAccounts` signature matches its caller in Task 5. `useSafeConnections`/`useSafeSwitchAccount`/`WagmiConfigShape.connectors` defined in Task 4/5 and used in Task 5.
- **Deviation:** persistence covers selection only (not `activeAccountId`) — see header rationale; delegated to wagmi/solana-adapter storage.

```

```
