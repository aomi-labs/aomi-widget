# Account Abstraction Architecture

This document describes the AA (Account Abstraction) module structure, how configuration flows through the system, and the execution paths for both the React library and the CLI.

**Layout:** All paths below are under `packages/client/src/` unless noted.

---

## Module Dependency Graph

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TB
    subgraph "AA core (aa/)"
        TYPES[types.ts<br/>AAConfig, AAState, executeWalletCalls]
        OWNER[owner.ts<br/>AAOwner, getOwnerParams]
        ENV_AGG[env.ts<br/>readEnv, readGasPolicyEnv<br/>isProviderConfigured<br/>resolveDefaultProvider]
        ADAPT[adapt.ts<br/>adaptSmartAccount<br/>isAlchemySponsorshipLimitError]
        RESOLVE_BARREL[resolve.ts<br/>re-exports]
        CREATE_FACADE[create.ts<br/>createAAProviderState]
    end

    subgraph "aa/alchemy/"
        ALCH_ENV[env.ts<br/>key/policy env lists]
        ALCH_RES[resolve.ts<br/>resolveAlchemyConfig]
        ALCH_PROV[provider.ts<br/>createAlchemyAAProvider]
        ALCH_CREATE[create.ts<br/>createAlchemyAAState]
    end

    subgraph "External SDK (dynamic import)"
        AA_ALCH["@getpara/aa-alchemy"]
    end

    subgraph "Consumers"
        EXEC[cli/execution.ts<br/>resolveCliExecutionDecision<br/>createCliProviderState]
        AA_CFG[cli/aa-config.ts<br/>~/.aomi/aa.json]
        WALLET[cli/commands/wallet.ts<br/>signCommand, fallbacks]
        TX_DEF[cli/commands/defs/tx.ts<br/>aomi tx sign]
        REACT[React<br/>useAlchemyAAProvider]
    end

    ALCH_ENV --> ENV_AGG
    RESOLVE_BARREL --> ALCH_RES
    TYPES --> ALCH_RES
    TYPES --> ADAPT
    TYPES --> CREATE_FACADE
    OWNER --> ALCH_CREATE
    ADAPT --> ALCH_CREATE
    ALCH_RES --> ALCH_PROV
    ALCH_RES --> ALCH_CREATE
    CREATE_FACADE --> ALCH_CREATE

    AA_ALCH -.-> ALCH_CREATE

    ENV_AGG --> EXEC
    RESOLVE_BARREL --> EXEC
    CREATE_FACADE --> EXEC
    AA_CFG --> EXEC
    EXEC --> WALLET
    TX_DEF --> WALLET
    ALCH_PROV --> REACT
```

Pimlico uses the same folder pattern under `aa/pimlico/` (`@getpara/aa-pimlico`); it is omitted here to keep the diagram small.

**SDK boundary:** `@getpara/aa-alchemy` and `@getpara/aa-pimlico` are loaded only inside `aa/alchemy/create.ts` and `aa/pimlico/create.ts` (dynamic `import()`). Other modules depend on the abstract `AALike` shape and `AAOwner` resolution from `owner.ts`.

---

## Owner model (`AAOwner`)

Smart-account creation takes an **`AAOwner`**, not a bare private key:

- **`{ kind: "direct", privateKey }`** — CLI path; viem `privateKeyToAccount` feeds the Para SDK.
- **`{ kind: "session", adapter: "para", session, signer?, address? }`** — session-backed signing (extensible; unsupported adapters yield a clear error state).

`getOwnerParams()` maps `AAOwner` into the shape expected by `createAlchemySmartAccount` / `createPimlicoSmartAccount`. The CLI wrapper `createCliProviderState` in `cli/execution.ts` always passes `owner: { kind: "direct", privateKey }`.

---

## CLI persistence

Config file: **`~/.aomi/aa.json`**. `cli/aa-config.ts` stores optional defaults: preferred `provider`, `mode` (4337 | 7702), `fallback` (`eoa` | `none`), and per-provider `apiKey` / `gasPolicyId` (Alchemy).

**Credential resolution (CLI):** For each provider, `readEnv(...)` is tried first; if missing, persisted keys from `aa.json` are used (`getPersistedAAApiKey`, `getPersistedAlchemyGasPolicyId`).

**Provider selection (CLI, `resolveAAProvider` in `execution.ts`):** when the user has forced AA mode (`--aa`, or `--aa-provider`, or `--aa-mode`, or env `AOMI_AA_PROVIDER` / `AOMI_AA_MODE` via `getConfig`): explicit `aaProvider` from flag/env (must have a key or an error is thrown) → else persisted `provider` (if that provider has a key) → else first env/persisted match for alchemy → pimlico. If nothing is configured, `resolveCliExecutionDecision` throws with a “configure AA” message.

**Persisted `fallback` (`eoa` | `none`):** Still read/written by `aa-config` and shown in **`aomi aa status`**. Signing does **not** read it anymore — there is no automatic EOA retry after AA failure.

Users manage this file via **`aomi aa status | set | test | reset`**.

---

## The `publicOnly` Flag

The single knob that separates browser-safe from CLI usage:

```mermaid
graph LR
    subgraph "Library path (React hooks)"
        LH[createAlchemyAAProvider<br/>createPimlicoAAProvider]
        LR[resolveAlchemyConfig<br/>resolvePimlicoConfig]
        LE[readEnv]
        LH -->|"publicOnly: true"| LR
        LR -->|"publicOnly: true"| LE
        LE -->|"skips ALCHEMY_API_KEY<br/>reads NEXT_PUBLIC_ALCHEMY_API_KEY"| ENV_PUB[Browser-safe env vars]
    end

    subgraph "CLI path"
        CE[resolveCliExecutionDecision<br/>createCliProviderState]
        CR[resolveAlchemyConfig<br/>resolvePimlicoConfig]
        CRE[readEnv + persisted keys]
        CE -->|"publicOnly: false (default)"| CR
        CR -->|"publicOnly: false"| CRE
        CRE -->|"env first, then ~/.aomi/aa.json"| ENV_ALL[Keys + gas policy]
    end
```

---

## Config resolution flow

```mermaid
flowchart TD
    START([calls + chainsById + options]) --> NULL_CHECK{calls is null<br/>or localPrivateKey?}
    NULL_CHECK -->|yes| RET_NULL([return null])
    NULL_CHECK -->|no| CHAIN_CFG[getAAChainConfig<br/>find matching chain in AAConfig]

    CHAIN_CFG --> CHAIN_OK{chain config<br/>found?}
    CHAIN_OK -->|no + throwOnMissingConfig| THROW1([throw Error])
    CHAIN_OK -->|no| RET_NULL
    CHAIN_OK -->|yes| READ_KEY[readEnv API key candidates<br/>respecting publicOnly<br/>+ optional apiKey override]

    READ_KEY --> KEY_OK{API key<br/>found?}
    KEY_OK -->|no + throwOnMissingConfig| THROW2([throw Error])
    KEY_OK -->|no| RET_NULL
    KEY_OK -->|yes| CHAIN_LOOKUP{chain in<br/>chainsById?}

    CHAIN_LOOKUP -->|no| RET_NULL
    CHAIN_LOOKUP -->|yes| GAS{Alchemy?}

    GAS -->|yes| GAS_POL[readGasPolicyEnv<br/>chain-specific then base]
    GAS -->|no / pimlico| MODE_CHECK

    GAS_POL --> SPONSOR_CHECK{sponsorship required<br/>and no policy?}
    SPONSOR_CHECK -->|yes + throw| THROW3([throw Error])
    SPONSOR_CHECK -->|yes| RET_NULL
    SPONSOR_CHECK -->|no| MODE_CHECK

    MODE_CHECK{modeOverride<br/>provided?}
    MODE_CHECK -->|yes| VALIDATE_MODE{mode in<br/>supportedModes?}
    VALIDATE_MODE -->|no + throw| THROW4([throw Error])
    VALIDATE_MODE -->|no| RET_NULL
    VALIDATE_MODE -->|yes| BUILD_PLAN
    MODE_CHECK -->|no| BUILD_PLAN

    BUILD_PLAN[buildAAExecutionPlan<br/>→ AAExecutionPlan] --> RETURN([return ResolvedConfig])
```

---

## Library AA flow (React hooks)

```mermaid
sequenceDiagram
    participant App as App component
    participant Hook as useAlchemyAAProvider
    participant Resolve as resolveAlchemyConfig
    participant Env as readEnv
    participant Types as getAAChainConfig
    participant UserHook as useAlchemyAA

    App->>Hook: calls, localPrivateKey

    Hook->>Resolve: resolve config (publicOnly: true)
    Resolve->>Env: readEnv(ALCHEMY_API_KEY_ENVS, publicOnly: true)
    Env-->>Resolve: apiKey or undefined
    Resolve->>Types: getAAChainConfig(config, calls, chainsById)
    Types-->>Resolve: AAChainConfig or null
    Resolve->>Types: buildAAExecutionPlan(config, chainConfig)
    Types-->>Resolve: AAExecutionPlan

    alt Config resolved
        Resolve-->>Hook: AlchemyResolvedConfig
        Hook->>UserHook: AlchemyHookParams (enabled, apiKey, chain, rpcUrl, gasPolicyId, mode)
        UserHook-->>Hook: account, pending, error
        Hook-->>App: AAState { resolved, account, pending, error }
    else Config not resolved
        Resolve-->>Hook: null
        Hook->>UserHook: undefined (disabled)
        UserHook-->>Hook: empty query
        Hook-->>App: AAState (resolved: null, …)
    end
```

---

## CLI AA flow (`aomi tx sign`)

```mermaid
sequenceDiagram
    participant User as User (terminal)
    participant Tx as tx sign → signCommand
    participant Exec as resolveCliExecutionDecision
    participant Resolve as resolveAlchemyConfig / resolvePimlicoConfig
    participant Persist as readAAConfig (~/.aomi/aa.json)
    participant CliCreate as createCliProviderState
    participant AACreate as createAAProviderState
    participant SDK as AA SDK (dynamic)
    participant Adapt as adaptSmartAccount
    participant Execute as executeWalletCalls
    participant Chain as Chain

    User->>Tx: aomi tx sign tx-1 ...
    Tx->>Exec: config, chain, callList
    Exec->>Persist: provider + keys + mode (when resolving AA)
    Exec->>Resolve: calls, chainsById, modeOverride, throwOnMissingConfig: true
    Resolve-->>Exec: resolved plan + mode (4337 may be overridden for ERC-20 + 4337)
    Exec-->>Tx: CliExecutionDecision { execution: aa|eoa, provider?, aaMode? }

    Tx->>CliCreate: decision, chain, privateKey, rpcUrl, callList
    CliCreate->>AACreate: owner: direct privateKey, apiKey/gasPolicy from env + persist
    AACreate->>SDK: createAlchemySmartAccount / createPimlicoSmartAccount
    SDK-->>AACreate: ParaSmartAccountLike
    AACreate->>Adapt: adaptSmartAccount
    Adapt-->>AACreate: AALike
    AACreate-->>Tx: AAState { resolved, account, … }

    Tx->>Execute: executeCliTransaction → executeWalletCalls once
    Execute->>Execute: plan + account → executeViaAA (or EOA if decision was eoa)

    alt Single call
        Execute->>Execute: AA.sendTransaction(call)
    else Batch
        Execute->>Execute: AA.sendBatchTransaction(calls)
    end

    Execute->>Chain: UserOperation / 7702 delegation
    Chain-->>Execute: receipt
    Execute-->>Tx: ExecutionResult { txHash, executionKind, sponsored, … }

    Tx-->>User: Sent! Hash: 0x…
```

**4337 + ERC-20:** If the planned mode is **4337** and calldata looks like ERC-20 `approve` / `transfer` / `transferFrom`, `execution.ts` may **auto-switch to 7702** when that mode is supported on the chain (tokens stay on the EOA). Otherwise it logs a warning and keeps 4337.

**Alchemy gas sponsorship (CLI):** `createCliProviderState` does not pass `sponsored`; `createAlchemyAAState` defaults to **`sponsored: true`**, so a gas policy is applied when configured. Failures surface to the user; there is no unsponsored retry or EOA fallback in `signCommand`.

---

## AA execution routing

`executeWalletCalls` (in `aa/types.ts`) still branches on **`resolved.fallbackToEoa`** when the hook/provider left an error on `AAState` without a usable account. That flag comes from **`AAConfig`** in app/widget usage. The CLI Alchemy creator sets **`fallbackToEoa: false`** on the resolved plan, so the CLI private-key path normally goes AA or EOA based on `CliExecutionDecision`, not this branch.

```mermaid
flowchart TD
    START([executeWalletCalls]) --> HAS_AA{providerState.resolved<br/>+ providerState.account?}

    HAS_AA -->|yes| VIA_AA[executeViaAA]

    VIA_AA --> BATCH{calls.length > 1?}
    BATCH -->|yes| BATCH_TX[AA.sendBatchTransaction]
    BATCH -->|no| SINGLE_TX[AA.sendTransaction]
    BATCH_TX --> AA_RESULT([ExecutionResult<br/>executionKind: provider_mode<br/>sponsored: from plan])
    SINGLE_TX --> AA_RESULT

    HAS_AA -->|no| HAS_ERROR{resolved + error<br/>+ !resolved.fallbackToEoa?}
    HAS_ERROR -->|yes| THROW([throw error])

    HAS_ERROR -->|no| VIA_EOA[executeViaEoa]

    VIA_EOA --> HAS_PK{localPrivateKey?}
    HAS_PK -->|yes| PK_PATH[viem WalletClient<br/>per-call sendTransaction<br/>+ waitForReceipt]
    HAS_PK -->|no| WALLET_PATH{wallet capabilities<br/>atomic supported?}

    WALLET_PATH -->|yes| SEND_CALLS[sendCallsSyncAsync<br/>atomic batch]
    WALLET_PATH -->|no| SEND_INDIVIDUAL[sendTransactionAsync<br/>per-call]

    PK_PATH --> EOA_RESULT([ExecutionResult<br/>executionKind: eoa<br/>sponsored: false])
    SEND_CALLS --> EOA_RESULT
    SEND_INDIVIDUAL --> EOA_RESULT
```

---

## CLI execution model

No silent fallbacks and no AA↔EOA retry chain. `signCommand` in `wallet.ts`:

1. `resolveCliExecutionDecision()` → `CliExecutionDecision`: `{ execution: "eoa" }` or `{ execution: "aa", provider, aaMode }` (no `fallbackToEoa` field).
2. `createCliProviderState()` builds `AAState` or `DISABLED_PROVIDER_STATE` for EOA.
3. `executeCliTransaction()` → `executeWalletCalls()` **once**. Errors propagate.

**Execution mode (`args.ts` → `CliConfig.execution`):**

- `--eoa` → always EOA.
- `--aa`, or **`--aa-provider`**, or **`--aa-mode`** (or `AOMI_AA_PROVIDER` / `AOMI_AA_MODE`) → AA; throws if no provider credentials.
- Otherwise → **EOA**, even when AA keys exist — users must pass one of the AA triggers above to use AA.

| Keys in env / `aa.json`? | Flags / env forcing AA | Result |
|---|---|---|
| Yes | `--aa` (or `--aa-provider` / `--aa-mode` / env equivalents) | AA; fail on error |
| Yes | `--eoa` | EOA |
| Yes | (none) | EOA |
| No | AA forced | Error: configure provider + key |
| No | (none) or `--eoa` | EOA |

Users typically run `aomi aa set provider <name>` and `aomi aa set key <key>`, then pass **`--aa`** (or set provider/mode flags) on `aomi tx sign`.

---

## Smart account adapter

The `adaptSmartAccount` function bridges the SDK-specific `ParaSmartAccountLike` shape into the library's abstract `AALike` interface:

```mermaid
graph LR
    subgraph "SDK shape (ParaSmartAccountLike)"
        SA_ADDR[smartAccountAddress: Hex]
        SA_SEND["sendTransaction() → TransactionReceipt"]
        SA_BATCH["sendBatchTransaction() → TransactionReceipt"]
    end

    subgraph "adaptSmartAccount()"
        ADAPT[Bridge layer]
    end

    subgraph "Library shape (AALike)"
        AA_ADDR[AAAddress: Hex]
        AA_SEND["sendTransaction() → { transactionHash }"]
        AA_BATCH["sendBatchTransaction() → { transactionHash }"]
    end

    SA_ADDR -->|rename| ADAPT
    SA_SEND -->|"unwrap receipt.transactionHash"| ADAPT
    SA_BATCH -->|"unwrap receipt.transactionHash"| ADAPT
    ADAPT --> AA_ADDR
    ADAPT --> AA_SEND
    ADAPT --> AA_BATCH
```

---

## Env var resolution order

| Provider | Env var (private-first) | Env var (`publicOnly`) |
|----------|-------------------------|-------------------------|
| **Alchemy API key** | `ALCHEMY_API_KEY` → `NEXT_PUBLIC_ALCHEMY_API_KEY` | `NEXT_PUBLIC_ALCHEMY_API_KEY` |
| **Alchemy gas policy** | `ALCHEMY_GAS_POLICY_ID_{CHAIN}` → `ALCHEMY_GAS_POLICY_ID` → `NEXT_PUBLIC_*` variants | `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID_{CHAIN}` → `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID` |
| **Pimlico API key** | `PIMLICO_API_KEY` → `NEXT_PUBLIC_PIMLICO_API_KEY` | `NEXT_PUBLIC_PIMLICO_API_KEY` |

**Default provider (`resolveDefaultProvider` in `env.ts`, env only):** alchemy (if configured) → pimlico (if configured) → throw.

**CLI** additionally uses `~/.aomi/aa.json` and flags; see [CLI persistence](#cli-persistence) above.

---

## Key files

| File | Purpose | Imports SDK? |
|------|---------|----------------|
| `aa/types.ts` | Core types, `executeWalletCalls`, plans | No |
| `aa/owner.ts` | `AAOwner`, `getOwnerParams` for creators | No |
| `aa/env.ts` | `readEnv`, gas policy helpers, provider detection; re-exports env name lists | No |
| `aa/alchemy/env.ts` | Alchemy env name constants | No |
| `aa/pimlico/env.ts` | Pimlico env name constants | No |
| `aa/adapt.ts` | Adapter + sponsorship error helper | No |
| `aa/resolve.ts` | Re-exports `resolveAlchemyConfig`, `resolvePimlicoConfig` | No |
| `aa/alchemy/resolve.ts` | Alchemy config resolution | No |
| `aa/pimlico/resolve.ts` | Pimlico config resolution | No |
| `aa/create.ts` | `createAAProviderState` facade | No |
| `aa/alchemy/create.ts` | `createAlchemyAAState` | **Yes** (dynamic `@getpara/aa-alchemy`) |
| `aa/pimlico/create.ts` | `createPimlicoAAState` | **Yes** (dynamic `@getpara/aa-pimlico`) |
| `aa/alchemy/provider.ts` | `createAlchemyAAProvider` hook factory | No |
| `aa/pimlico/provider.ts` | `createPimlicoAAProvider` | No |
| `cli/execution.ts` | `resolveCliExecutionDecision`, `createCliProviderState`, ERC-20 mode guard | No |
| `cli/args.ts` | `getConfig`, `resolveExecutionMode` (`--aa` / `--eoa` / implied AA) | No |
| `cli/aa-config.ts` | Persistent AA JSON config | No |
| `cli/commands/wallet.ts` | `signCommand`, single-shot `executeCliTransaction` | No |
| `cli/commands/aa.ts` | `aomi aa` handlers (incl. test path to `createAAProviderState`) | No |
