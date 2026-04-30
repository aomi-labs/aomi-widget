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

| Chain    | ID    | Default AA Mode | Supported AA Modes |
| -------- | ----- | --------------- | ------------------ |
| Ethereum | 1     | 7702            | 4337, 7702         |
| Polygon  | 137   | 4337            | 4337, 7702         |
| Arbitrum | 42161 | 4337            | 4337, 7702         |
| Base     | 8453  | 4337            | 4337, 7702         |
| Optimism | 10    | 4337            | 4337, 7702         |

These match the live `aomi chain list` output in CLI v0.1.30.

## Sponsorship

Sponsorship is available for **4337 mode only**. 7702 does not support sponsorship. Sponsorship policy is configured on the provider's side — the user's provider account decides whether a given UserOperation is sponsored. Once the user has configured their provider, `aomi tx sign` (with the appropriate AA flags if the user wants an explicit provider) will pick up the active policy automatically.

### Sponsorship in practice (verified against v0.1.30)

The "zero-config Alchemy proxy" path is not a guarantee of free gas. Empirically:

- **Ethereum mainnet, default 7702**: works cleanly. Gas is paid out of the EOA's small ETH stash via the 7702 delegation contract (`0x6900...E139`). Verified across approve+swap, swap-back, and approve+bridge batches.
- **Base, default 4337 with the zero-config proxy**: observed to **not** sponsor in CLI v0.1.30. Even with `--aa --aa-mode 4337` explicit, `aomi tx sign` returned `insufficient funds for transfer` from viem when the EOA had 0 native gas on Base. The call appeared to fall through to a direct EOA `eth_sendTransaction` rather than a sponsored UserOperation.

**Practical rule the skill must follow**: before signing on an L2, confirm the EOA has a small amount of native gas on the destination chain (~0.0005 ETH equivalent is enough). If the user is sending USDC-only to an L2 with no native gas, warn them that signing on that L2 will fail unless they:

1. fund the EOA with a tiny amount of native gas on that chain, **or**
2. configure a real BYOK AA provider on their side (Alchemy with a Gas Manager policy attached, or Pimlico with a sponsorship policy on the dashboard — the user sets the credential in their own environment) and pass `--aa-provider alchemy|pimlico --aa-mode 4337` on `aomi tx sign`. The exact credential variable names are documented by `aomi --help`; the skill does not hard-code them.

Do not promise the user "AA will pay for gas on L2s" without verifying the user's setup. The default proxy path may silently fall through.

When the CLI emits a viem `insufficient funds for transfer` error followed by `Use --eoa to sign without account abstraction`, that is the failure signature. Do not re-run with `--eoa` blindly — `--eoa` will also fail if the EOA has 0 gas. Stop and tell the user to fund the destination chain or configure a sponsoring BYOK provider.

## Supported Chains

| Chain         | ID       | AA available? |
| ------------- | -------- | ------------- |
| Ethereum      | 1        | Yes (4337, 7702; default 7702) |
| Polygon       | 137      | Yes (4337, 7702; default 4337) |
| Arbitrum One  | 42161    | Yes (4337, 7702; default 4337) |
| Base          | 8453     | Yes (4337, 7702; default 4337) |
| Optimism      | 10       | Yes (4337, 7702; default 4337) |
| Sepolia       | 11155111 | No AA defaults — use `--eoa` |
| Anvil (local) | 31337    | No AA defaults — local fork; use `--eoa` |

For Sepolia and Anvil, `aomi tx sign` without `--eoa` may fail. Pass `--eoa` explicitly when signing on these chains.

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
