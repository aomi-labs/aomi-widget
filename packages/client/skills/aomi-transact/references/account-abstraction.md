# Account Abstraction Reference

Read this when:

- The user asks about AA modes, sponsorship, or chain defaults.
- `aomi tx sign` returns an AA error and you need to pick a flag.
- The user explicitly requests `4337` or `7702`.

## Execution Model

The CLI uses **auto-detect** by default and always signs via AA unless `--eoa` is passed:

| User-side provider configured? | Flag | Result |
|---|---|---|
| Pimlico configured | `--aa-provider pimlico` | Pimlico BYOK (user-side credential) |
| Alchemy configured | (none) | Alchemy BYOK (user-side credential) |
| Nothing configured | (none) | **Alchemy proxy via the aomi backend — zero-config AA** |
| Any | `--aa-provider`/`--aa-mode` | AA with explicit settings |
| Any | `--eoa` | Direct EOA, skip AA |

There is **no silent EOA fallback**. If AA is selected and both AA modes fail, the CLI returns a hard error suggesting `--eoa`. The zero-config proxy path means the user does not need any provider credential of their own for AA to work.

## Mode Fallback

When using AA, the CLI tries modes in order:

1. Try preferred mode (default: 7702 for Ethereum, 4337 for L2s).
2. If preferred mode fails, try the alternative mode (7702 ↔ 4337).
3. If both modes fail, return error with suggestion: use `--eoa` to sign without AA.

## AA Configuration

AA is configured per-invocation via flags or by credentials the user has configured on their side. There is no persistent AA config file on the skill's side.

Priority chain for AA resolution: **flag > user-side credential > backend zero-config default**.

## AA Providers

| Provider | Flag                    | Notes                            |
| -------- | ----------------------- | -------------------------------- |
| Alchemy  | `--aa-provider alchemy` | 4337 (sponsored via gas policy), 7702 (EOA pays gas) |
| Pimlico  | `--aa-provider pimlico` | 4337 (sponsored via dashboard policy) |

Provider selection rules:

- If the user explicitly selects a provider via flag, use it.
- In auto-detect mode, the CLI picks whichever provider the user has configured on their side — the skill treats that choice as opaque.
- If no AA provider is configured, auto-detect uses the zero-config path provided by the aomi backend.

The skill never configures provider credentials itself. If `aomi tx sign` reports missing provider credentials, stop and ask the user to configure them before re-running.

## AA Modes

| Mode   | Flag             | Meaning                          | Gas |
| ------ | ---------------- | -------------------------------- | --- |
| `4337` | `--aa-mode 4337` | Bundler + paymaster UserOperation via smart account. Gas sponsored by paymaster. | Paymaster pays |
| `7702` | `--aa-mode 7702` | Native EIP-7702 type-4 transaction with delegation. EOA signs authorization + sends tx to self. | EOA pays |

**7702 requires the signing EOA to have native gas tokens** (ETH, MATIC, etc.). There is no paymaster/sponsorship for 7702. Use 4337 for gasless execution.

## Default Chain Modes

| Chain    | ID    | Default AA Mode |
| -------- | ----- | --------------- |
| Ethereum | 1     | 7702            |
| Polygon  | 137   | 4337            |
| Arbitrum | 42161 | 4337            |
| Base     | 8453  | 4337            |
| Optimism | 10    | 4337            |

## Sponsorship

Sponsorship is available for **4337 mode only**. 7702 does not support sponsorship. Sponsorship policy is configured on the provider's side — the user's provider account decides whether a given UserOperation is sponsored. Once the user has configured their provider, `aomi tx sign` (with the appropriate AA flags if the user wants an explicit provider) will pick up the active policy automatically.

## Supported Chains

| Chain        | ID       |
| ------------ | -------- |
| Ethereum     | 1        |
| Polygon      | 137      |
| Arbitrum One | 42161    |
| Base         | 8453     |
| Optimism     | 10       |
| Sepolia      | 11155111 |

## RPC Guidance By Chain

Use an RPC that matches the pending transaction's chain:

- Ethereum txs → Ethereum RPC
- Polygon txs → Polygon RPC
- Arbitrum txs → Arbitrum RPC
- Base txs → Base RPC
- Optimism txs → Optimism RPC
- Sepolia txs → Sepolia RPC

Practical rule:

- `--chain` affects the wallet/session context for chat and request building.
- `--rpc-url` affects where `aomi tx sign` estimates and submits the transaction.
- Treat them as separate controls and keep them aligned with the transaction you are signing.
