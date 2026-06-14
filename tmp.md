Let me re-read the current state of the providers and runtime-user-sync to ensure the table is accurate:

# Final UserState shape — synced via all paths

Two tables: **(A)** connect-time state, **(B)** post-tx mutations. All values shown are post-`UserState.normalize` (snake_case wire format).

## A. Connect-time UserState by path

| Field | CLI no-AA | CLI `--aa 4337` | Base+sponsored | Base unsponsored | Para+OAuth+alchemy | Para+OAuth no-AA | Para external (QR) | Para Solana-only | Disconnected | Booting |
|---|---|---|---|---|---|---|---|---|---|---|
| `address` | `0xEOA` | `0xEOA` | `0xSA` | `0xSA` | `0xParaEOA` | `0xParaEOA` | `0xExternalEOA` | – | – | – |
| `wallet_kind` | – | `"eoa"` | `"smart-account"` | `"smart-account"` | `"eoa"` | `"eoa"` | `"eoa"` | – | – | – |
| `aa_mode` | – | `"4337"` | `"4337"` | `"4337"` | `"none"` | `"none"` | `"none"` | – | `null` | – |
| `smart_account_4337` | – | – | – | – | – | – | – | – | `null` | – |
| `delegation_7702` | – | – | – | – | – | – | – | – | `null` | – |
| `chain_id` | `1` | `1` | `8453` | `8453` | `1` | `1` | `1` | – | – | – |
| `is_connected` | `true` | `true` | `true` | `true` | `true` | `true` | `true` | `true` | `false` | – |
| `ens_name` | – | – | – | – | – | – | – | – | – | – |
| `svm_address` | – | – | – | – | – | – | – | `"<base58>"` | – | – |
| `wallet_provider` | – | – | `"baseAccount"` | `"baseAccount"` | `"para"` | `"para"` | `"para"` | `"para"` | `null` | – |
| `auth_method` | – | – | `null` | `null` | `"google"` * | `"google"` * | `"wagmi"` | `"google"` ‡ | `null` | – |
| `sponsored` | – | – | `true` | `false` | `true` | `false` | `true` | – | `null` | – |
| `sponsor_provider` | – | – | `"coinbase"` | `"self"` | `"alchemy"` | `"self"` | `"alchemy"` | – | `null` | – |
| `sponsor_account` | – | – | `null` ¹ | `null` | `"fb17d7d7-…"` ² | `null` | `"fb17d7d7-…"` | – | `null` | – |
| `ext.client_type` | `"ts_cli"` | `"ts_cli"` | `"web_ui"` | `"web_ui"` | `"web_ui"` | `"web_ui"` | `"web_ui"` | `"web_ui"` | `"web_ui"` | – |

Legend: `–` = field absent from snapshot (not normalized into UserState).  
`null` = field explicitly set to null by `runtime-user-sync` to clear stale state.

\* Other valid `auth_method` values: `"apple" | "facebook" | "x" | "discord" | "github" | "farcaster" | "telegram" | "email" | "phone" | "basic_login"`.  
‡ Para Solana-only only captures `auth_method` if the user went through OAuth; otherwise undefined.  
¹ Base/Coinbase paymaster URLs contain API keys → not safe to expose.  
² Alchemy gas policy ID is safe public-ish ID; for Pimlico this is `null` (no safe identifier; API key is the binding).

## B. Post-tx mutations to UserState

Only `aa_mode`, `wallet_kind`, `smart_account_4337`, `delegation_7702` can change after a tx. Everything else stays.

| Scenario | tx kind | After-tx writes ([session.ts:445-453](packages/client/src/session.ts:445)) |
|---|---|---|
| **Base Account** | single or batched (always 4337) | `aa_mode: "4337"`, `wallet_kind: "smart-account"`, `smart_account_4337: <addr>` (= `address`), `delegation_7702: null` |
| **Para+OAuth, embedded signer, single tx** | EOA path | `aa_mode: "none"`, `wallet_kind: "eoa"`, `smart_account_4337: null`, `delegation_7702: null` |
| **Para+OAuth, embedded signer, batched tx** | tries `7702` first, then `4337` if fails | `aa_mode: "7702"` or `"4337"`; `wallet_kind: "eoa"`; mode-specific addr populated |
| **Para external (wagmi/QR), single tx** | EOA path | same as Para+OAuth single tx |
| **Para external (wagmi/QR), batched tx** | forced to `4337` (external signer can't do 7702) | `aa_mode: "4337"`, `wallet_kind: "eoa"`, `smart_account_4337: <derived AA addr>`, `delegation_7702: null` ← **the new visible field** |
| **CLI `--aa 7702`** | 7702 | `aa_mode: "7702"`, `delegation_7702: <addr>`, `smart_account_4337: null` |
| **CLI `--aa 4337`** | 4337 | `aa_mode: "4337"`, `smart_account_4337: <addr>`, `delegation_7702: null` |

`smart_account_4337` and `delegation_7702` are **mode-exclusive** on each write: a 4337 tx sets the former and nulls the latter, and vice versa. Each is "the address for the AA mode of the most recent tx" — not "last known per mode."

## C. Sync invariants

| Source | Writes | Read by |
|---|---|---|
| Wallet kit providers ([para.tsx:506-521](apps/registry/src/lib/aomi-wallet-kit/providers/para.tsx:506), [base-account.tsx:188-209](apps/registry/src/lib/aomi-wallet-kit/providers/base-account.tsx:188)) | `AomiSessionIdentity` fields including `SmartAccount4337` / `Delegation7702` (from local `resolvedAA` state, captured in `sendTransaction` wrapper) | UI (connect button, etc.) |
| `AomiWalletKitSync` ([runtime-user-sync.tsx:21-49](apps/registry/src/lib/aomi-wallet-kit/runtime-user-sync.tsx:21)) | Pushes identity → UserState via `setUser` (camelCase normalized) | Backend (via `AomiClient.sendMessage`) |
| `session.ts:445-453` tx-complete handler | Writes UserState directly with same per-tx result | Backend |

**Convergence:** both writers operate on the **same** `result.SmartAccount4337` / `result.Delegation7702` from `executeWalletKitTransaction`, on the same render tick. The reducer in `setUser` ([user-context.tsx:76-108](packages/react/src/contexts/user-context.tsx:76)) merges by key — last-writer-wins per field, but values match either way.

**Reset on context change:** identity's `resolvedAA` is cleared by `useEffect(() => setResolvedAA(null), [address, chainId])` in each provider; UserState's `smart_account_4337` / `delegation_7702` are preserved by the reconciler **only when address matches** ([types.ts:303-317](packages/client/src/types.ts:303)).

## D. Fields the client forwards but never originates

| Field | Origin | Purpose |
|---|---|---|
| `pending_txs`, `pending_eip712s`, `pending_solana_txs`, `next_id` | Backend pushes in `AomiStateResponse.user_state` or `AomiChatResponse.user_state` | In-flight wallet requests; consumed by `pendingTxsFromBackendUserState` etc. |
| `ens_name` | SDK consumer via `setUser({ ensName })` if integrated; no current path populates it | Display name for connected wallet |

These are typed in the interface for documentation and forwarding fidelity; the reconciler ([types.ts:319-326](packages/client/src/types.ts:319)) preserves `ens_name` under the AA-context rules.