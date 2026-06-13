# Wallet Provider Plugin Refactor Plan

> Canonical plan as of **2026-06-13**. Supersedes the prior revision of this
> file, `WALLET-ARCHITECTURE.md` §12–13, and `WALLET-REFACTOR-PLAN.md`.
> Grounded in `meeting-2026-06-10-wallet-auth-backend-frontend.md`.

## Purpose

The wallet/auth layer must not be permanently shaped around Para. Aomi core
should own the wallet/account runtime; Para, Privy, Base Account, and a future
custom/Better-Auth provider are **optional capability plugins**. A client must
be able to run with Para, with Privy, with normal wallets and no hosted auth, or
with their own connectors — without rewriting the integration.

This is **one big PR that finalizes the decoupling**, landed as a sequence of
independently-green, individually-committed phases (P0–P8). The end state:

- Everything that works today keeps working (Para auth, MetaMask/Rabby/
  WalletConnect, Phantom/Solflare, switching, AA, network switching).
- **Lost wallets are restored**: an Aomi-owned connector catalog supplies
  EIP-6963 + WalletConnect + Coinbase in every mode, with Base Account available
  everywhere when explicitly requested. Para's modal becomes auth-only.
- **One composition path**: Para, Privy, and Base all flow through
  `AomiAdapterComposer`; no provider hand-builds the adapter.
- **Wallets-only / no-auth is a first-class, shipped mode.**
- **Account abstraction works without a hosted session** (external-wallet 4337).
- Public surface is **capability-shaped** (`auth` / `wallets` / `execution` /
  `account`) with presets; vendor config is sugar that compiles to lanes.
- A typed, stub Account Runtime seam exists so the Better-Auth backend lights up
  stored/linked wallet rows with zero composer changes. Persistence stays the
  localStorage registry key until then.

## Locked Decisions (2026-06-13)

Do not re-litigate during execution.

1. **One big PR**, sequenced as commit-sized phases P0–P8, each independently
   green. (May be split into a stacked series only if review load demands it;
   the phase boundaries are the split points.)
2. **Naming: the wallet/account layer is `AomiWalletKit*`.** `AomiRuntime*` is
   already taken by the chat widget (`@aomi-labs/react` exports
   `AomiRuntimeProvider` / `AomiRuntimeApi` / `useAomiRuntime`). Adapter type
   `AomiAuthAdapter → AomiWalletKit`; entry `AomiWalletProvider →
   AomiWalletKitProvider`; hook `useAomiAuthAdapter → useAomiWalletKit`.
3. **Every renamed symbol keeps a `@deprecated` alias for 1–2 releases.**
   Consumers exist via npm (`@aomi-labs/widget-lib`, `@aomi-labs/react`
   0.3.x, `@aomi-labs/client` 0.1.x) and the shadcn-style registry; nothing
   breaks on merge.
4. **Aomi owns one isolated wagmi config + connector catalog.** Hosts add
   connectors via `wallets.evm.connectors` (data), never by mounting their own
   `WagmiProvider`. Adopting a host `WagmiProvider` is deferred.
5. **Easy presets use Aomi defaults; production hosts override.** WalletConnect
   ships an Aomi default projectId. Para may ship an Aomi default project only
   if we are comfortable that quickstart users belong to the Aomi Para app; docs
   must recommend client-owned credentials for production branding, limits,
   analytics, and account ownership. Exactly one `walletConnect()` connector
   lives in the catalog; a host passes a projectId, not a WC connector.
6. **Connect UI is Aomi-owned.** The picker renders installed (EIP-6963) +
   WalletConnect + Coinbase rows; clicking WalletConnect opens WC's own QR
   modal. No hosted-provider modal is needed for wallets.
7. **Config is presets + override + BYO.** Public shape is
   `wallets: { evm, solana, embedded }`. Embedded is usually omitted (inferred
   from the selected session provider).
8. **Base Account is fully replumbed but not default**: a `baseAccount()`
   connector in the EVM catalog plus a Base execution policy, enabled only by an
   explicit wallet list/preset override. It is no longer a top-level provider
   mode and no longer hand-builds an adapter.
9. **`walletProvider` splits into `sessionProvider` / `embeddedProvider` /
   `walletSource`.** Types land now; the `/api/state` payload migration is
   deferred with the backend. `walletProvider` stays a deprecated alias and maps
   only to `sessionProvider ?? embeddedProvider ?? null`; never encode
   `walletSource` into the legacy provider field. Do not reuse
   `identity.authProvider`: on `origin/main` it already exists as a deprecated
   alias for `authMethod`.
10. **Account abstraction owner is provider-supplied and session-optional.** The
    `@aomi-labs/client` `AAOwner` union gains an **additive** `external-wallet`
    variant; the CLI's `direct` path and Para's `session` path are untouched.
    Wallets-only/Privy get real AA. 7702→4337 fallback for external signers
    stays.
11. **Canonical auth is singular; linked providers are plural.** One Aomi
    session (Better Auth, later). Multiple providers/embedded wallets link under
    one canonical user and are switchable; hosted SDKs mount **lazily**, one
    driving at a time. Two live embedded SDKs as concurrent signers is deferred.
12. **A stored backend wallet is read-visible only.** Write authority is a
    separate, backend-owned approval record (impersonation risk, 06-10 meeting).
    We reserve `capability?: "read" | "write"`; we do not enforce.
13. **"Preview" is dropped** — it was a mis-transcription of "Privy." Privy
    embedded wallets cover it.

## Target Mental Model — Capability Lanes

Aomi core owns the registry, connector catalog, composer, and adapter. Providers
supply lanes. Color/ownership:

- **Aomi-owned (always):** WalletRegistry, EVM/SVM connector catalog, wallet
  runtimes, composer, `AomiWalletKit` adapter, picker UI, account merge.
- **Plugin-supplied (optional):** auth (login/methods/credential), embedded
  wallets, AA execution owner/policy, account UI.

```
AomiWalletKitProvider  (capability config: auth · wallets · execution · account)
        │
        ▼
   ┌────────────── capability lanes ──────────────┐
   Auth      Wallet (EVM/SVM catalog)   Embedded   Execution   Account(stub)
   │  (Para/Privy/none)   (Aomi)       (provider)  (provider)   (Aomi/backend)
   └──────────────────────┬───────────────────────┘
                          ▼
       WalletRegistry ── AomiAdapterComposer   (one build path)
                          ▼
                   AomiWalletKit (adapter)  ──►  Aomi widget UI + runtime
```

A plugin may fill several lanes (Para → auth + embedded + AA owner). Aomi core
consumes generic lane interfaces and never asks "is this Para?" outside
`providers/<provider>/`.

## Naming Map (old → new)

Every old name remains as a `@deprecated export` alias for 1–2 releases.

| Today | Target | Notes |
| --- | --- | --- |
| `AomiAuthAdapter` | `AomiWalletKit` | the assembled runtime object |
| `useAomiAuthAdapter` | `useAomiWalletKit` | context hook |
| `AomiAuthAdapterProvider` | `AomiWalletKitContextProvider` | context wrapper |
| `AomiWalletProvider` (union) | `AomiWalletKitProvider` | public entry, now capability-shaped |
| `AomiAuthIdentity` | `AomiSessionIdentity` | current-session identity |
| `AomiAuthStatus` | `AomiSessionStatus` | — |
| `socialLoginOptions` / `connectSocial` | `authMethods` / `authenticate` | not all auth is "social" |
| `evmWallets` / `solanaWallets` (+ `connectEvmWallet` / `connectSolanaWallet`) | `walletOptions` (family-tagged) / `connectWallet(optionId)` | one list, family is a field |
| `AomiWalletProvider` type `"para"\|"privy"\|"base-account"` | split → `sessionProvider` / `embeddedProvider` / `walletSource` | see Identity Split |
| `WalletFamily = "evm" \| "solana"` | public stays `"solana"`; **wire/internal use `"svm"`** | delete `WireWalletFamily` duality; drop `@deprecated solana` aliases |
| `para/logout` command | `provider/logout` | already partly done |

Optional, cuttable: rename the folder `lib/aomi-auth-adapter/ →
lib/aomi-wallet-kit/`. Default: keep the folder name for import-path /
registry-artifact stability; rename only if P8 has slack.

## Public API — Exact Structs

`config/types.ts` (new). Canonical config keeps provider SDK/bootstrap config
separate from capability selection. Flat vendor config may remain as ergonomic
sugar, but normalizes into this shape.

```ts
export type AuthProviderId = "para" | "privy" | "custom" | "none";

export type AuthMethodId =
  | "google" | "apple" | "x" | "discord" | "github"
  | "farcaster" | "telegram" | "email" | "phone" | "passkey"
  | "wallet"; // reserved for SIWE — NOT built this PR

export type ProvidersConfig = {
  para?: {
    apiKey?: string;                      // omitted → Aomi default, if enabled
    environment?: "PROD" | "BETA";
    appName?: string;
    appDescription?: string;
    appUrl?: string;
  } | false;
  privy?: {
    appId?: string;                       // omitted → Aomi default only if we choose to ship one
    appName?: string;
    appLogoUrl?: string;
  } | false;
};

export type AuthConfig =
  | { provider: "para"; methods?: readonly AuthMethodId[] }
  | { provider: "privy"; methods?: readonly AuthMethodId[] }
  | { provider: "custom"; getSession: () => Promise<AomiSession | null>;
      login: () => Promise<void>; logout: () => Promise<void> }
  | false; // wallets-only / no hosted auth

export type WalletId =
  // evm
  | "metamask" | "rabby" | "coinbase" | "rainbow" | "walletconnect" | "baseAccount"
  // svm
  | "phantom" | "solflare" | "backpack" | "glow"
  | (string & {}); // host custom

export type EvmWalletPreset = "popular" | "evm-only" | "minimal";
export type SvmWalletPreset = "popular" | "minimal";

export type EvmWalletsConfig = {
  chains?: readonly Chain[];
  preset?: EvmWalletPreset;                       // sugar → wallets[]
  wallets?: readonly WalletId[];                  // explicit allowlist + order
  connectors?: readonly CreateConnectorFn[];      // BYO wagmi connectors
  walletConnectProjectId?: string;                // overrides the Aomi default
  coinbase?: boolean;                             // default true
  appName?: string;                               // defaults from provider/top-level metadata or "Aomi"
  appLogoUrl?: string;
  transports?: Record<number, Transport>;
};

export type SvmWalletsConfig = {
  preset?: SvmWalletPreset;
  wallets?: readonly WalletId[];
  networks?: readonly SvmNetworkOption[];
  preferDirectSend?: boolean;
};

export type EmbeddedConfig = { provider: "para" | "privy" | "aomi" } | false;

export type WalletsConfig = {
  evm?: EvmWalletsConfig | false;
  solana?: SvmWalletsConfig | false;
  embedded?: EmbeddedConfig;   // usually omitted — inferred from the selected session provider
};

export type ExecutionConfig = {
  aa?: "off" | "optional" | "required";
  modes?: ReadonlyArray<"4337" | "7702">;
  owner?: "auto" | "external-wallet" | "provider-session";
  sponsorship?: SponsorshipConfig;
};

export type AccountConfig =
  | { mode: "disabled" }
  | { mode: "aomi-backend"; baseUrl?: string }; // same-origin cookie fetch (deferred wiring)

export type AomiWalletKitProviderProps = {
  preset?: "para" | "privy" | "wallets-only"; // expands to the fields below
  providers?: ProvidersConfig;
  auth?: AuthConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig;
  requirements?: AppWalletRequirements;
  children: React.ReactNode;
};

export type AomiWalletKitProviderInput =
  | AomiWalletKitProviderProps
  | {
      /** sugar only: normalized into providers.para + auth.provider */
      auth: { provider: "para"; apiKey?: string; environment?: "PROD" | "BETA";
              methods?: readonly AuthMethodId[]; appName?: string; appDescription?: string };
      children: React.ReactNode;
    }
  | {
      /** sugar only: normalized into providers.privy + auth.provider */
      auth: { provider: "privy"; appId?: string; methods?: readonly AuthMethodId[]; appName?: string };
      children: React.ReactNode;
    };
```

Usage:

```tsx
// Para auth + Aomi-owned wallets + embedded (implicit)
<AomiWalletKitProvider
  providers={{ para: { apiKey, environment: "PROD", appName } }}
  auth={{ provider: "para", methods: ["google", "email"] }}
  wallets={{
    evm: { preset: "popular", chains, walletConnectProjectId },
    solana: { preset: "popular", networks },
  }}
  execution={{ aa: "optional", sponsorship }}
/>

// Wallets-only — first-class, no hosted auth
<AomiWalletKitProvider preset="wallets-only" />
// expands to: auth=false, wallets={ evm:{preset:"popular"}, solana:{preset:"popular"} },
//             execution={ aa:"optional" }, account={ mode:"disabled" }

// Easiest Para quickstart — uses Aomi defaults where configured
<AomiWalletKitProvider preset="para" />

// BYO connector + explicit allowlist
<AomiWalletKitProvider
  auth={false}
  wallets={{ evm: { wallets: ["metamask", "walletconnect"], connectors: [myConnector] } }}
/>
```

Ergonomic sugar is allowed for migration/quickstart, but is not the canonical
mental model:

```tsx
<AomiWalletKitProvider auth={{ provider: "para", apiKey, methods: ["google"] }} />
// normalizes to providers.para.apiKey + auth.provider/methods
```

## Core Lane Interfaces — Exact Structs

`composer/types.ts` (target):

```ts
export type AuthRuntime = {
  provider: AuthProviderId;
  status: "booting" | "authenticated" | "unauthenticated";
  subject?: string;             // provider subject — NOT the canonical Aomi user id
  primaryLabel?: string;
  authMethod?: AuthMethodId;
  authValue?: string;
  methods: readonly AuthMethodOption[];
  canOpenModal: boolean;
  login?: (reason: string, methodId?: string) => Promise<void>;
  logout?: () => Promise<void>;
  openAccountUI?: (reason: string, step?: string) => Promise<void>;
  startFlow?: (reason: string) => void;
  getCredential?: () => Promise<AomiAccountCredential | null>;
};

export type AuthMethodOption = {
  id: string; label: string; provider: AuthProviderId;
  kind: AuthMethodId; iconUrl?: string;
};

export type WalletRuntime<F extends WalletFamily> = {
  family: F;
  status: "ready" | "unavailable";
  accounts: readonly WalletAccount[];
  options: readonly WalletOption[];       // was evmWalletOptions / solana descriptors
  activeAccount?: WalletAccount;
  supportedNetworks: readonly NetworkOption[];
  connect: (optionId?: string) => Promise<void>;
  disconnect: (accountId?: string) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  selectNetwork?: (networkId: string | number) => Promise<void>;
  // EVM impl also exposes: registryStore, registryState, selectEvmIdentity,
  // selectAccounts, getWalletClientFor, *Async signing primitives, etc.
};

export type EmbeddedWalletRuntime = {
  provider: "para" | "privy" | "aomi";
  status: "ready" | "unavailable";
  accounts: readonly WalletAccount[];     // family-tagged, source: "embedded"
  createOrConnect?: (family?: WalletFamily) => Promise<void>;
  openWalletUI?: () => Promise<void>;
};

export type ExecutionRuntime = {
  evm?: EvmExecutionRuntime;
  svm?: SvmExecutionRuntime;              // NEW — symmetric with EVM
  sponsorship: SponsorshipState;
};

export type EvmExecutionRuntime = {
  sendTransaction: (p: WalletTxPayload) => Promise<AomiTxResult>;
  signTypedData: (p: WalletEip712Payload) => Promise<{ signature: string }>;
  signMessage:  (p: WalletEip712Payload) => Promise<{ signature: string }>;
  resolveAAOwner?: AAOwnerResolver;       // provider-supplied; session-optional
  activeConnector?: Connector;
  capabilities?: WalletExecutionAdapterState["capabilities"];
  chainsById: Record<number, Chain>;
  currentChainId?: number;
  walletClient: WalletClient | undefined;
  getWalletClientFor: EvmWalletRuntime["getWalletClientFor"];
  shouldUseExternalSigner: boolean;
  sendCallsSyncAsync: EvmWalletRuntime["sendCallsSyncAsync"];
  sendTransactionAsync: EvmWalletRuntime["sendTransactionAsync"];
  switchChainAsync: EvmWalletRuntime["switchChainAsync"];
  signMessageAsync: EvmWalletRuntime["signMessageAsync"];
  signTypedDataAsync: EvmWalletRuntime["signTypedDataAsync"];
};

export type SvmExecutionRuntime = {
  signTransaction: (p: WalletSolanaSignPayload) => Promise<{ signedTx: string }>;
  signMessage?: (p: WalletSolanaSignMessagePayload) => Promise<{ signature: string }>;
  sendTransaction?: (p: WalletSolanaSignPayload) => Promise<{ signature: string; signedTx?: string }>;
  signAndSendTransaction?: (p: WalletSolanaSignPayload) => Promise<{ signature: string; signedTx?: string }>;
};

// The owner is resolved by the active provider; no hosted session is required
// for an external-wallet owner.
export type AAOwnerResolver = (ctx: {
  requestedMode: "4337" | "7702";
  shouldUseExternalSigner: boolean;
  walletClient?: WalletClient;
  address?: Hex;
}) => Promise<AomiAAOwnerInput | null>;

export type AccountRuntime = {
  status: "disabled" | "loading" | "ready" | "error";
  user?: AomiUserRef;
  linkedAccounts: readonly LinkedAuthAccount[];
  wallets: readonly AccountWallet[];
  refresh: () => Promise<void>;
  linkWallet?: (accountId: string) => Promise<void>;
  unlinkWallet?: (walletId: string) => Promise<void>;
};
```

## Identity Split — Exact Structs

`types.ts` (target additions; existing fields unchanged):

```ts
export type SessionProvider = "para" | "privy" | "custom";
export type EmbeddedProvider = "para" | "privy" | "aomi";
export type WalletSource =
  | "injected" | "walletconnect" | "coinbase" | "baseAccount"
  | "embedded" | "stored";

export type AomiSessionIdentity = {
  // ...all existing AomiAuthIdentity fields...
  /**
   * Who logged the user in. Intentionally not named `authProvider`: on
   * origin/main, `authProvider` is a deprecated alias for `authMethod`.
   */
  sessionProvider?: SessionProvider;
  embeddedProvider?: EmbeddedProvider; // platform backing an embedded wallet
  walletSource?: WalletSource;         // how the active wallet connects / signs
  /** @deprecated use sessionProvider/embeddedProvider; kept until /api/state migration */
  walletProvider?: AomiWalletProvider;
};

/** @deprecated use AomiSessionIdentity */
export type AomiAuthIdentity = AomiSessionIdentity;
```

`context.tsx`'s `AomiAuthAdapterSync` keeps writing `walletProvider` to
`UserState` this PR (payload frozen — decision 9). When the backend migration
lands, it switches to the migrated provider fields.

Compatibility rule until `/api/state` migrates:

```ts
legacyWalletProvider = sessionProvider ?? embeddedProvider ?? null;
```

Do **not** encode signer source into the legacy provider field. For example,
Para auth + MetaMask signer remains legacy `connection.provider: "para"` even
though the frontend identity knows `walletSource: "injected"`. Wallets-only
MetaMask sends `connection.provider: null` plus `evm.address`.

Backend migration note: when we coordinate backend work, expand
`user_state.connection` additively instead of overloading `provider`:

```ts
connection: {
  provider?: AomiWalletProvider | null; // deprecated legacy alias
  auth_provider?: SessionProvider | null;
  embedded_provider?: EmbeddedProvider | null;
  wallet_source?: WalletSource | null;
}
```

## Account-Abstraction Owner — Exact Change

`packages/client/src/aa/owner.ts` — **additive only** (`AAOwner` is defined
there on `origin/main` and re-exported from `aa/create.ts`):

```ts
export type AAOwner =
  | { kind: "direct"; privateKey: `0x${string}` }                       // CLI — UNCHANGED
  | { kind: "session"; adapter: string; session: unknown;              // Para embedded — UNCHANGED
      signer?: unknown; address?: Hex }
  | { kind: "external-wallet"; signer: unknown; address: Hex };        // NEW
```

`execution/aa-owner.ts` (new widget-local bridge) — convert lane owner inputs
to `@aomi-labs/client` owners:

```ts
export type AomiAAOwnerInput =
  | { kind: "provider-session"; provider: "para" | "privy"; session: unknown;
      signer?: unknown; address?: Hex }
  | { kind: "external-wallet"; walletClient: unknown; address: Hex }   // now IMPLEMENTED
  | { kind: "direct"; privateKey: `0x${string}` };

export function toClientAAOwner(owner: AomiAAOwnerInput): AAOwner {
  switch (owner.kind) {
    case "provider-session":
      return { kind: "session", adapter: owner.provider, session: owner.session,
               signer: owner.signer, address: owner.address };
    case "external-wallet":
      return { kind: "external-wallet", signer: owner.walletClient, address: owner.address };
    case "direct":
      return { kind: "direct", privateKey: owner.privateKey };
  }
}
```

In `@aomi-labs/client`'s smart-account builder, add `kind:
"external-wallet"` owner support (viem WalletClient → account/signer) without
touching the `direct` (CLI) or `session` (Para) branches. The exact extraction
may be provider-specific (Alchemy vs Pimlico); either implement both with tests
or scope v1 to one provider and fail clearly for the other. Para's resolver
keeps requiring a session for its embedded case; the generic/wallets-only
resolver builds `external-wallet` owners and never gates on a hosted session.
Keep the 7702→4337 fallback for external signers.

## Connector Catalog — Exact Structs

`catalog/evm-connector-catalog.ts` (new):

```ts
export const AOMI_DEFAULT_WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_AOMI_WC_PROJECT_ID ?? "<aomi-shared-default-projectid>";

export const EVM_PRESETS: Record<EvmWalletPreset, readonly WalletId[]> = {
  popular:    ["metamask", "rabby", "coinbase", "walletconnect"],
  "evm-only": ["metamask", "rabby", "walletconnect"],
  minimal:    ["metamask", "walletconnect"],
};

export function createAomiEvmConfig(input: ResolvedEvmWalletsConfig): Config {
  const chains = normalizeEvmChains(input.chains);
  const wanted = new Set(input.wallets ?? EVM_PRESETS[input.preset ?? "popular"]);
  const wcProjectId = input.walletConnectProjectId ?? AOMI_DEFAULT_WC_PROJECT_ID;
  const hostConnectors = input.connectors ?? [];

  const connectors: CreateConnectorFn[] = [
    injected({ shimDisconnect: true }),                       // EIP-6963: installed wallets
    ...(wanted.has("walletconnect") && wcProjectId
        ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : []),
    ...(input.coinbase !== false && wanted.has("coinbase")
        ? [coinbaseWallet({ appName: input.appName })] : []),
    ...(wanted.has("baseAccount")
        ? [baseAccount({ appName: input.appName, paymasterUrls: {} })] : []),
    ...hostConnectors,                                        // host BYO
  ];

  return createConfig({
    chains,
    connectors,
    transports: input.transports ?? defaultHttpTransports(chains),
    multiInjectedProviderDiscovery: true,
    ssr: true,
  });
}
```

Rules: exactly **one** `walletConnect()` connector (hosts pass a projectId, not
a connector). If `input.connectors` includes a WalletConnect-like connector,
the catalog warns and drops/ignores the duplicate so the picker never creates
two QR paths. The existing `runtime/evm/brands.ts` dedupe collapses brand
overlap (BYO MetaMask + EIP-6963 MetaMask → one row by `canonicalWalletKey`).
WalletConnect rows are visible even though they are not installed extension
rows (`kind: "walletconnect"` / `status: "qr"` or `"available"` are renderable
connect actions). `catalog/svm-wallet-catalog.ts` does the analogous Aomi-owned
Solana list (Phantom/Solflare/Backpack/Glow) so wallets-only Solana works
without Para.

Base Account is **not** part of `popular`; enable it explicitly:

```tsx
<AomiWalletKitProvider
  wallets={{ evm: { wallets: ["metamask", "walletconnect", "baseAccount"] } }}
/>
```

This `Config` replaces the duplicated provider-specific wagmi setup on
`origin/main`: Para's `externalWalletConfig.evmConnector.config`, Privy's
`createPrivyWagmiConfig`, and Base Account's `createBaseAccountConfig`. All
providers mount the same catalog; Para additionally mounts its SDK for
auth/embedded/AA only.

## Account Row Merge — Exact Structs

`composer/merge-wallet-rows.ts` is introduced by this PR and consumed by the
picker through `AomiAdapterComposer`:

```ts
export type WalletRowAction =
  | { kind: "select"; label: string }
  | { kind: "connect"; label: string }
  | { kind: "authenticate"; label: string }  // stored embedded, signed-out provider → auth.login
  | { kind: "disconnect"; label: string }
  | { kind: "manage"; label: string }
  | { kind: "link"; label: string }
  | { kind: "unlink"; label: string };

export type WalletModalRow = {
  id: string;
  family: WalletFamily;
  address?: string;
  label: string;
  walletName?: string;
  source: "live" | "embedded" | "stored" | "option";
  status: "active" | "connected" | "stored" | "available" | "unavailable";
  provider?: string;
  linked?: boolean;                 // known to the backend
  capability?: "read" | "write";    // reserved (decision 12)
  actions: WalletRowAction[];
};
```

The picker consumes `WalletModalRow[]` instead of assembling from
`accounts` + `walletOptions` ad hoc. With the disabled Account Runtime the
stored array is empty → identical UX; when the backend fills it, linked/stored
rows (incl. `authenticate`) appear with no UI change.

## Target Folder Structure

Root folder kept (`lib/aomi-auth-adapter/`) for import-path + registry-artifact
stability. `(new)` is created by this plan.

```txt
lib/aomi-auth-adapter/
  index.ts                         public exports + @deprecated aliases
  types.ts                         AomiWalletKit, AomiSessionIdentity, WalletAccount, ...

  config/                  (new)   capability config + presets (public surface)
    AomiWalletKitProvider.tsx      public entry (replaces providers/index.tsx union)
    presets.ts                     preset="para"|"privy"|"wallets-only" → lane config
    auth-config.ts                 AuthConfig normalization
    wallet-config.ts               Evm/SvmWalletsConfig normalization
    execution-config.ts            ExecutionConfig normalization
    account-config.ts              AccountConfig normalization
    types.ts                       *Config structs (above)

  composer/                (new) one build path
    AomiAdapterComposer.tsx
    build-identity.ts  build-accounts.ts  build-methods.ts
    merge-wallet-rows.ts  types.ts

  catalog/                 (new)   Aomi-owned connector catalog
    evm-connector-catalog.ts       createAomiEvmConfig(), EVM_PRESETS, WC default
    svm-wallet-catalog.ts          Aomi-owned Solana wallet list + presets
    wallet-ids.ts                  WalletId union + preset tables

  runtime/                 (new/extracted from current provider files)
    evm/            provider.tsx wallet-runtime.ts brands.ts disconnect-plan.ts
                     identity-grace.ts registry-source.ts safe-hooks.ts
    svm/            networks.ts registry-source.ts wallet-runtime.ts transactions.ts

  execution/               (new)   execution lane (moved out of root)
    execution-runtime.ts           ExecutionRuntime assembly (evm + svm)
    aa-owner.ts                    AAOwnerResolver, AomiAAOwnerInput bridge
    execute.ts                     executeAdapterTransaction (from wallet-execution.ts)

  registry/  (new)     reducer.ts policy.ts commands.ts store.ts
                       selectors.ts persistence.ts types.ts use-wallet-registry.ts

  account/   (new)     types.ts disabled-runtime.ts
             (later)   http-runtime.ts   (Better-Auth fetch; deferred)

  providers/
    para/          (new/extracted; shrinks current providers/para.tsx)
                                  ParaPluginProvider.tsx para-auth.ts
                   para-embedded-wallet.ts para-aa.ts para-svm.tsx
                   sources/para-session-source.ts index.ts
    privy/         (new/extracted; → composer)
                                  PrivyPluginProvider.tsx privy-auth.ts
                   privy-embedded.ts index.ts
    base-account/  (new/extracted; → connector + execution)
                                  base-account-connector.ts
                   base-account-execution.ts index.ts
```

Re-exports keep existing registry import sites working when
`wallet-execution.ts` moves under `execution/`. The client package's
`packages/client/src/aa/owner.ts` remains the source of truth for
`@aomi-labs/client` `AAOwner`.

## Migration Plan (P0–P8)

Per-phase commits are mandatory. Every phase that moves/adds files updates
`apps/registry/src/registry.ts` file lists, runs `pnpm run build:registry`,
syncs `apps/registry/dist` → `apps/landing/public/r`, and keeps the pinned
`packages/client/test/registry-chain-artifacts.unit.test.ts` green.

### P0 — Vocabulary & types  ·  risk: low
- Add `AomiWalletKit*` names + `@deprecated` aliases for every renamed symbol
  (`index.ts`, `types.ts`).
- Add `sessionProvider`/`embeddedProvider`/`walletSource` to
  `AomiSessionIdentity` (optional); `walletProvider` becomes the deprecated
  alias. Preserve the existing `authProvider?: AomiAuthMethod` compatibility
  field as-is until it can be removed in a later breaking release.
- Preserve only compatibility that exists on `main` / published npm or registry
  surfaces. Do **not** carry branch-only names as aliases merely because this
  unfinished PR introduced them. In particular, keep
  `AomiAuthAdapter`, `AomiAuthAdapterProvider`, `useAomiAuthAdapter`,
  `AomiAuthIdentity`, `AomiAuthStatus`, existing provider components, existing
  `AomiWalletProvider({ provider: "para" | "privy" | "base-account" })`, and
  main-shipped adapter fields (`connect`, `disconnect`, `solanaWallets`,
  `connectSolanaWallet`, tx/signing methods, etc.).
- Collapse `evm`/`solana` vs `evm`/`svm` to one internal vocabulary; remove
  `WireWalletFamily` and `@deprecated solana` aliases internally (public family
  string stays `"solana"`).
- **Verify:** typecheck (registry + landing) + full suites green; zero behavior
  change.

### P1 — Connector catalog → wallets restored  ·  risk: med
- Create `catalog/` (`createAomiEvmConfig`, `EVM_PRESETS`,
  `AOMI_DEFAULT_WC_PROJECT_ID`, SVM catalog). Add `walletConnect()` +
  `coinbaseWallet()` to the config the EVM runtime observes (initially the
  config Para mounts), threading `walletConnectProjectId`. Leave Base out of the
  default `popular` preset; Base support lands explicitly in P5.
- Replace the hardcoded Para "More wallets" option
  (`ParaPluginProvider.tsx:260`) with catalog-driven options; clicking
  WalletConnect opens WC's QR modal, not Para's modal.
- Update picker visibility so WalletConnect rows render even when they are not
  installed extension rows; add a duplicate-WC guard for host BYO connectors.
- **Verify:** WalletConnect connects and surfaces as a real account in Para mode;
  installed wallets still appear; manual matrix WC row. Registry suite green.

### P2 — One composer path (Privy)  ·  risk: med
- `PrivyPluginProvider` builds `AuthRuntime` / `EvmWalletRuntime` (over the Aomi
  catalog) / `EmbeddedWalletRuntime` / `ExecutionRuntime` and passes them to
  `AomiAdapterComposer`. Delete the hand-built adapter in `privy.tsx`.
- Preserve Privy-specific behavior while moving to lanes: login method config,
  access-token credential, embedded Solana creation, `SmartWalletsProvider`,
  `walletConnectCloudProjectId`, supported/default chain config, and
  dashboard-configured smart-wallet/paymaster behavior.
- **Verify:** `/privy` route manual matrix; Privy auth + embedded + external
  wallet; tests for the Privy lanes. No `AomiAuthAdapter` literal outside
  `composer/`.

### P3 — De-Para the core  ·  risk: med
- Move `transformEvmIdentity` / `transformAccounts` / `canManageAccount` logic
  out of the composer call into the Para plugin's own runtime construction.
- Generalize registry internals: `PARA_SESSION_UID` →
  provider-described embedded-session source; `para-*` suppression reasons →
  a `providerReason` enum implemented by Para.
- **Goal:** `grep -ri para runtime/ composer/ registry/` returns nothing.
- **Verify:** registry reducer/policy/store suites green; Para cancel-login
  no-wipe regression holds.

### P4 — Symmetric execution lane + AA owner fix  ·  risk: med
- Move registry `wallet-execution.ts` → `execution/execute.ts` and create
  widget-local `execution/aa-owner.ts` (re-exports preserve registry imports).
  In `packages/client/src/aa/owner.ts`, add the additive `external-wallet`
  `AAOwner` variant without moving the client file.
- Add `SvmExecutionRuntime`; stop spreading `solanaMethods` into the adapter.
- Implement the additive `external-wallet` `AAOwner` in `@aomi-labs/client`;
  the generic resolver builds session-less external-wallet owners; drop the
  `if (!paraSession)` gate from the generic path.
- Be explicit per AA provider. Implement and test external-wallet owner support
  for Alchemy and Pimlico, or scope v1 to one provider and fail clearly for the
  other. Do not assume a single signer-extraction branch covers both provider
  SDK paths.
- **Verify:** new "external-wallet 4337, no session" unit test; existing client
  AA + CLI + registry-artifact tests green (all `direct`/`session`); wallets-only
  AA manual row.

### P5 — Base Account replumb  ·  risk: med-high (own gate)
- Express Base as a `baseAccount()` connector in the EVM catalog +
  `base-account-execution.ts` policy. Delete the bespoke adapter in
  `base-account.tsx`. Base is no longer a provider mode and is never included in
  the default `popular` preset; it appears only when explicitly requested.
- **Verify:** Base smart-account connect + sponsored tx still work via the
  catalog/execution path; dedicated manual check (this touches a just-stabilized
  flow).

### P6 — Public AomiWalletKit API  ·  risk: med
- `config/AomiWalletKitProvider.tsx` + lane config factories + `presets.ts`
  (`para`/`privy`/`wallets-only`). Ship **wallets-only** as a documented,
  first-class mode.
- Keep legacy wrappers as real compatibility shims over the new provider:
  `AomiWalletProvider`, `AomiParaProvider`, `AomiPrivyProvider`,
  `AomiBaseAccountProvider`, and the legacy context/hook names.
- Presets use Aomi defaults for quickstart/demo (`preset="para"`,
  `preset="wallets-only"`); docs call out production overrides for Para,
  WalletConnect, RPCs, branding, rate limits, analytics, and ownership.
- **Verify:** all three preset modes mount and pass their manual matrices;
  capability config compiles to the same lanes the provider components produced.

### P7 — Account merge wired  ·  risk: low
- `AomiAdapterComposer` consumes `mergeWalletRows` output; the picker renders
  `WalletModalRow[]`. Stored array empty (disabled runtime) → identical UX.
- Add a mocked-ready Account Runtime test proving stored/linked/`authenticate`
  rows render.
- **Verify:** picker tests green with mocked stored rows; disabled stub changes
  nothing.

### P8 — Rename finalize + compat aliases  ·  risk: low (cuttable last)
- Flip internal call sites to the new names; keep the `@deprecated` aliases.
- Optional folder rename if slack remains.
- **Verify:** full suites + both typechecks + lint; registry artifacts rebuilt +
  synced; pinned-artifact test green.

## Registry / Distribution Constraints

- Two channels: npm (`@aomi-labs/widget-lib` for wallet/provider exports,
  plus `@aomi-labs/react` runtime utilities and `@aomi-labs/client`) and the
  shadcn-style registry (`apps/registry/dist/*.json` →
  `apps/landing/public/r`).
- Any new/moved file under `lib/aomi-auth-adapter/` must be added to the
  relevant registry item file list in `apps/registry/src/registry.ts`, dist
  rebuilt, and `public/r` synced, or installs ship broken.
- Public npm exports in `apps/registry/src/index.ts` must expose both new
  `AomiWalletKit*` names and legacy aliases/wrappers that shipped from `main`.
  If docs introduce package subpath imports under `@aomi-labs/widget-lib`, add
  the matching `exports` entries to `apps/registry/package.json`; on
  `origin/main`, `./lib/*` subpaths are not exported.
- Keep the `lib/aomi-auth-adapter.ts` facade/import path working for registry
  installs even if internals move under `lib/aomi-auth-adapter/`.
- Registry dependencies must include any new connector/runtime packages needed
  by catalog files (WalletConnect, Coinbase, Base Account, Solana wallet
  adapters) in the registry items that actually ship those files.
- The pinned artifact test asserts specific registry file paths — update it when
  registry paths move (e.g. `wallet-execution.ts` → `execution/execute.ts`).
- Update landing/docs content that currently tells hosts to mount Para/wagmi
  directly. New docs should lead with `AomiWalletKitProvider` presets and show
  provider-owned credentials as production overrides.

## Deferred Work (out of this PR)

- **Real Account Runtime** over Better Auth (`account/http-runtime.ts`,
  same-origin cookie fetch, `/api/account/*`, link/unlink, multi-device).
- **`/api/state` payload migration** for `auth_provider`/`embedded_provider`
  (sequence with backend; `walletProvider` stays the wire field until then).
- **Approval / capability enforcement** (per-wallet/session/action granularity).
- **SIWE / `kind: "wallet"` auth method.**
- **Two live embedded SDKs** as concurrent signers (lazy-mount covers the
  realistic switch flow).
- **Host-owned `WagmiProvider` adoption** (RainbowKit/ConnectKit host apps).
- **Folder rename** `aomi-auth-adapter → aomi-wallet-kit` (cosmetic).

## Testing Strategy

Gates this PR: registry reducer/policy/store suites; EVM/SVM runtime hooks with
mocked wagmi/wallet-adapter; composer identity build; account row merge incl.
mocked stored rows + `authenticate`; connector catalog (WC option present,
single WC connector, duplicate host WC guard, dedupe); external-wallet 4337 AA
(no session) per supported AA provider; wallets-only mode; Para/Privy/Base modes;
legacy wrapper mounts from `main` public API; legacy `connection.provider`
payload compatibility. Manual (extensions required): the full matrix in the
prior revision plus WalletConnect connect without any hosted auth.

## Success Criteria

- WalletConnect + Coinbase + installed wallets connect in **every** mode,
  including wallets-only, with no hosted-provider modal.
- Base Account is available when explicitly requested and absent from default
  `popular` wallet rows.
- No `AomiAuthAdapter` (now `AomiWalletKit`) literal is constructed outside
  `composer/`.
- `grep -ri para` over `runtime/`, `composer/`, `registry/`, `catalog/`,
  `execution/` returns nothing.
- External-wallet 4337 works with no Para session; CLI `direct` AA unchanged.
- Public API is capability-shaped; `preset="wallets-only"` ships.
- `preset="para"` and `preset="wallets-only"` work with Aomi defaults, while
  production overrides remain straightforward.
- All renamed symbols resolve via `@deprecated` aliases; registry artifacts in
  sync; pinned test green.
- The existing manual matrix passes (no regressions in the stabilized Para
  flows).

## Resolved / Open

All prior open questions are closed in **Locked Decisions** above. The only
remaining open items are backend-gated and explicitly deferred: the Better-Auth
schema mapping (`users`/`linked_accounts`/`wallet_links`/`wallet_approvals`),
approval granularity, and the auth-prompt UX for stored embedded rows of a
signed-out provider.
