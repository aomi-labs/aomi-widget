# Account Abstraction Architecture

This document describes the AA (Account Abstraction) module structure, how configuration flows through the system, and the execution paths for both the React library and the CLI.

---

## Module Dependency Graph

```mermaid
graph TB
    subgraph "AA Core (packages/client/src/aa/)"
        TYPES[types.ts<br/>AALike, AAConfig, AAExecutionPlan<br/>executeWalletCalls, mapCall]
        ENV[env.ts<br/>readEnv, readGasPolicyEnv<br/>isProviderConfigured<br/>resolveDefaultProvider]
        ADAPT[adapt.ts<br/>adaptSmartAccount<br/>isAlchemySponsorshipLimitError<br/>ParaSmartAccountLike]
        RESOLVE[resolve.ts<br/>resolveAlchemyConfig<br/>resolvePimlicoConfig]
        CREATE[create.ts<br/>createAAProviderState]
        ALCHEMY[alchemy.ts<br/>createAlchemyAAProvider<br/>AlchemyHookParams]
        PIMLICO[pimlico.ts<br/>createPimlicoAAProvider<br/>PimlicoHookParams]
        INDEX[index.ts<br/>barrel exports]
    end

    subgraph "External SDKs"
        AA_ALCH["@getpara/aa-alchemy<br/>createAlchemySmartAccount"]
        AA_PIM["@getpara/aa-pimlico<br/>createPimlicoSmartAccount"]
    end

    subgraph "Consumers"
        CLI[cli/execution.ts<br/>resolveCliExecutionDecision<br/>createCliProviderState]
        WALLET[cli/commands/wallet.ts<br/>signCommand]
        REACT[React hooks<br/>useAlchemyAAProvider<br/>usePimlicoAAProvider]
    end

    ENV --> RESOLVE
    TYPES --> RESOLVE
    TYPES --> ADAPT
    TYPES --> ALCHEMY
    TYPES --> PIMLICO
    TYPES --> CREATE
    RESOLVE --> ALCHEMY
    RESOLVE --> PIMLICO
    RESOLVE --> CREATE
    ADAPT --> CREATE
    ENV --> CREATE
    AA_ALCH --> CREATE
    AA_PIM --> CREATE

    INDEX --> CLI
    INDEX --> WALLET
    INDEX --> REACT

    ALCHEMY -.-> REACT
    PIMLICO -.-> REACT
    CREATE -.-> CLI
    RESOLVE -.-> CLI
    ENV -.-> CLI
    ADAPT -.-> WALLET

    style CREATE fill:#f9f,stroke:#333
    style RESOLVE fill:#bbf,stroke:#333
    style ENV fill:#bfb,stroke:#333
    style ADAPT fill:#fbf,stroke:#333
```

**Key constraint:** Only `create.ts` imports `@getpara/aa-alchemy` and `@getpara/aa-pimlico`. All other modules work with the abstract `AALike` interface.

---

## The `publicOnly` Flag

The single knob that separates browser-safe from CLI usage:

```mermaid
graph LR
    subgraph "Library Path (React Hooks)"
        LH[createAlchemyAAProvider<br/>createPimlicoAAProvider]
        LR[resolveAlchemyConfig<br/>resolvePimlicoConfig]
        LE[readEnv]
        LH -->|"publicOnly: true"| LR
        LR -->|"publicOnly: true"| LE
        LE -->|"skips ALCHEMY_API_KEY<br/>reads NEXT_PUBLIC_ALCHEMY_API_KEY"| ENV_PUB[Browser-safe env vars]
    end

    subgraph "CLI Path"
        CE[resolveCliExecutionDecision<br/>createCliProviderState]
        CR[resolveAlchemyConfig<br/>resolvePimlicoConfig]
        CRE[readEnv]
        CE -->|"publicOnly: false (default)"| CR
        CR -->|"publicOnly: false"| CRE
        CRE -->|"reads ALCHEMY_API_KEY first<br/>falls back to NEXT_PUBLIC_*"| ENV_ALL[All env vars]
    end
```

---

## Config Resolution Flow

```mermaid
flowchart TD
    START([calls + chainsById + options]) --> NULL_CHECK{calls is null<br/>or localPrivateKey?}
    NULL_CHECK -->|yes| RET_NULL([return null])
    NULL_CHECK -->|no| CHAIN_CFG[getAAChainConfig<br/>find matching chain in AAConfig]

    CHAIN_CFG --> CHAIN_OK{chain config<br/>found?}
    CHAIN_OK -->|no + throwOnMissingConfig| THROW1([throw Error])
    CHAIN_OK -->|no| RET_NULL
    CHAIN_OK -->|yes| READ_KEY[readEnv API key candidates<br/>respecting publicOnly]

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

## Library AA Flow (React Hooks)

```mermaid
sequenceDiagram
    participant App as App Component
    participant Hook as useAlchemyAAProvider
    participant Resolve as resolveAlchemyConfig
    participant Env as readEnv
    participant Types as getAAChainConfig
    participant UserHook as useAlchemyAA

    App->>Hook: calls, localPrivateKey

    Hook->>Resolve: resolve config
    Resolve->>Env: readEnv(ALCHEMY_API_KEY_ENVS, publicOnly: true)
    Env-->>Resolve: apiKey or undefined
    Resolve->>Types: getAAChainConfig(config, calls, chainsById)
    Types-->>Resolve: AAChainConfig or null
    Resolve->>Types: buildAAExecutionPlan(config, chainConfig)
    Types-->>Resolve: AAExecutionPlan

    alt Config resolved
        Resolve-->>Hook: AlchemyResolvedConfig
        Hook->>UserHook: AlchemyHookParams (enabled, apiKey, chain, rpcUrl, gasPolicyId, mode)
        UserHook-->>Hook: AAProviderQuery (AA, isPending, error)
        Hook-->>App: AAProviderState (plan, AA, isPending, error)
    else Config not resolved
        Resolve-->>Hook: null
        Hook->>UserHook: undefined (disabled)
        UserHook-->>Hook: AAProviderQuery (no AA)
        Hook-->>App: AAProviderState (plan: null)
    end
```

---

## CLI AA Flow (Sign Command)

```mermaid
sequenceDiagram
    participant User as User (terminal)
    participant Sign as signCommand
    participant Exec as resolveCliExecutionDecision
    participant Resolve as resolveConfig
    participant Env as resolveDefaultProvider
    participant AACreate as createAAProviderState
    participant SDK as AA SDK
    participant Adapt as adaptSmartAccount
    participant Execute as executeWalletCalls
    participant Chain as Blockchain

    User->>Sign: aomi sign tx-1
    Sign->>Exec: config, chain, callList

    Exec->>Env: resolveDefaultProvider()
    Env-->>Exec: "alchemy" or "pimlico"
    Exec->>Resolve: calls, chainsById, modeOverride, throwOnMissingConfig: true
    Resolve-->>Exec: ResolvedConfig (plan with mode)
    Exec-->>Sign: CliExecutionDecision { execution: "aa", provider, aaMode }

    Sign->>AACreate: provider, chain, privateKey, rpcUrl, callList, mode, sponsored
    AACreate->>Resolve: resolve again (for apiKey, gasPolicyId)
    AACreate->>SDK: createAlchemySmartAccount({ signer, apiKey, gasPolicyId, chain, rpcUrl, mode })
    SDK-->>AACreate: ParaSmartAccountLike
    AACreate->>Adapt: adaptSmartAccount(smartAccount)
    Adapt-->>AACreate: AALike
    AACreate-->>Sign: AAProviderState { plan, AA, error: null }

    Sign->>Execute: callList, providerState, localPrivateKey
    Execute->>Execute: plan + AA present, use executeViaAA

    alt Single call
        Execute->>Execute: AA.sendTransaction(call)
    else Batch
        Execute->>Execute: AA.sendBatchTransaction(calls)
    end

    Execute->>Chain: Submit UserOperation / 7702 delegation
    Chain-->>Execute: TransactionReceipt
    Execute-->>Sign: TransactionExecutionResult { txHash, executionKind, sponsored }

    Sign-->>User: Sent! Hash: 0x...
```

---

## AA Execution Routing

```mermaid
flowchart TD
    START([executeWalletCalls]) --> HAS_AA{providerState.plan<br/>+ providerState.AA?}

    HAS_AA -->|yes| VIA_AA[executeViaAA]

    VIA_AA --> BATCH{calls.length > 1?}
    BATCH -->|yes| BATCH_TX[AA.sendBatchTransaction]
    BATCH -->|no| SINGLE_TX[AA.sendTransaction]
    BATCH_TX --> AA_RESULT([TransactionExecutionResult<br/>executionKind: provider_mode<br/>sponsored: based on plan])
    SINGLE_TX --> AA_RESULT

    HAS_AA -->|no| HAS_ERROR{plan + error<br/>+ !fallbackToEoa?}
    HAS_ERROR -->|yes| THROW([throw error])

    HAS_ERROR -->|no| VIA_EOA[executeViaEoa]

    VIA_EOA --> HAS_PK{localPrivateKey?}
    HAS_PK -->|yes| PK_PATH[viem WalletClient<br/>per-call sendTransaction<br/>+ waitForReceipt]
    HAS_PK -->|no| WALLET_PATH{wallet capabilities<br/>atomic supported?}

    WALLET_PATH -->|yes| SEND_CALLS[sendCallsSyncAsync<br/>atomic batch]
    WALLET_PATH -->|no| SEND_INDIVIDUAL[sendTransactionAsync<br/>per-call]

    PK_PATH --> EOA_RESULT([TransactionExecutionResult<br/>executionKind: eoa<br/>sponsored: false])
    SEND_CALLS --> EOA_RESULT
    SEND_INDIVIDUAL --> EOA_RESULT
```

---

## CLI Sponsorship Fallback

```mermaid
sequenceDiagram
    participant Sign as signCommand
    participant AACreate as createAAProviderState
    participant Execute as executeWalletCalls
    participant Prompt as promptForEoaFallback
    participant User as User (terminal)

    Sign->>AACreate: sponsored: true
    AACreate-->>Sign: providerState (with gas policy)
    Sign->>Execute: execute with sponsored AA

    alt Success
        Execute-->>Sign: result
    else AlchemySponsorshipLimitError
        Sign->>Sign: isAlchemySponsorshipLimitError(error) = true
        Sign->>Sign: AA sponsorship unavailable. Retrying...
        Sign->>AACreate: sponsored: false
        AACreate-->>Sign: providerState (no gas policy, sponsorship: disabled)
        Sign->>Execute: execute with unsponsored AA

        alt Success
            Execute-->>Sign: result
        else Still fails
            Sign->>Prompt: promptForEoaFallback()
            Prompt->>User: AA not available, use EOA? [yes/no]
            User-->>Prompt: yes
            Sign->>AACreate: decision: { execution: eoa }
            AACreate-->>Sign: DISABLED_PROVIDER_STATE
            Sign->>Execute: execute via EOA (private key path)
            Execute-->>Sign: result
        end
    else Other error
        Sign->>Prompt: promptForEoaFallback()
        Prompt->>User: AA not available, use EOA? [yes/no]
        User-->>Prompt: no
        Sign-->>Sign: throw original error
    end
```

---

## Smart Account Adapter

The `adaptSmartAccount` function bridges the SDK-specific `ParaSmartAccountLike` shape
into the library's abstract `AALike` interface:

```mermaid
graph LR
    subgraph "SDK Shape (ParaSmartAccountLike)"
        SA_ADDR[smartAccountAddress: Hex]
        SA_SEND["sendTransaction() → TransactionReceipt"]
        SA_BATCH["sendBatchTransaction() → TransactionReceipt"]
    end

    subgraph "adaptSmartAccount()"
        ADAPT[Bridge layer]
    end

    subgraph "Library Shape (AALike)"
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

## Env Var Resolution Order

| Provider | Env Var (private-first) | Env Var (publicOnly) |
|----------|------------------------|---------------------|
| **Alchemy API Key** | `ALCHEMY_API_KEY` → `NEXT_PUBLIC_ALCHEMY_API_KEY` | `NEXT_PUBLIC_ALCHEMY_API_KEY` |
| **Alchemy Gas Policy** | `ALCHEMY_GAS_POLICY_ID_{CHAIN}` → `ALCHEMY_GAS_POLICY_ID` → `NEXT_PUBLIC_*` variants | `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID_{CHAIN}` → `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID` |
| **Pimlico API Key** | `PIMLICO_API_KEY` → `NEXT_PUBLIC_PIMLICO_API_KEY` | `NEXT_PUBLIC_PIMLICO_API_KEY` |

**Default provider resolution:** alchemy (if configured) > pimlico (if configured) > throw error.

---

## Key Files

| File | Purpose | Imports SDK? |
|------|---------|-------------|
| `types.ts` | Core types, execution logic (`executeWalletCalls`) | No |
| `env.ts` | Env var reading, provider detection | No |
| `adapt.ts` | Smart account adapter, error classification | No |
| `resolve.ts` | Config resolution for both providers | No |
| `create.ts` | Async smart account instantiation | **Yes** (`@getpara/aa-*`) |
| `alchemy.ts` | React hook factory (`createAlchemyAAProvider`) | No |
| `pimlico.ts` | React hook factory (`createPimlicoAAProvider`) | No |
| `cli/execution.ts` | CLI orchestration layer | No (delegates to `../aa`) |
