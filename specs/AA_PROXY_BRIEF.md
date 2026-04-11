# AA Proxy: Route Bundler/Paymaster Through Backend

## Goal

Ship AA signing that works out-of-the-box for CLI users without requiring them
to supply their own `ALCHEMY_API_KEY`. Aomi-labs' Alchemy key stays server-side
so usage rolls up to our account (billing, quotas, analytics).

## Current Flow (client-side key)

```
CLI ──[apiKey from env]──> eth-mainnet.g.alchemy.com/v2/<USER_KEY>
                           ├─ eth_getCode (check smart account)
                           ├─ sendCalls  (submit UserOp / 7702 delegation)
                           └─ waitForCallsStatus (poll receipt)
```

User must set `ALCHEMY_API_KEY`. Alchemy bills the user. Aomi-labs gets nothing.

## Target Flow (proxied key)

```
CLI ──> api.aomi.dev/aa/v1  ──[AOMI_ALCHEMY_KEY]──> alchemy.com
        (new proxy route)
```

User sets nothing. CLI uses backend as the AA transport. Backend forwards to
Alchemy with our key. User can still override with `ALCHEMY_API_KEY` env var
for power-user self-custody.

## Backend Changes

Add a single proxy route that forwards JSON-RPC to Alchemy:

```
POST /aa/v1/:chainSlug
```

- `chainSlug`: `eth-mainnet`, `polygon-mainnet`, `arb-mainnet`, `base-mainnet`,
  `opt-mainnet`, `eth-sepolia`
- Request body: raw JSON-RPC (`{ method, params, id, jsonrpc }`)
- Backend reads `ALCHEMY_API_KEY` from its own env
- Forwards to `https://{chainSlug}.g.alchemy.com/v2/{key}`
- Streams the response back verbatim
- Optional: rate-limit per client IP or session ID, log usage for billing

No auth required on this route (the CLI doesn't send `AOMI_API_KEY` during
signing today). Add rate limiting to prevent abuse.

## Client Changes

**File: `packages/client/src/aa/alchemy/create.ts`**

In `createAlchemyWalletApisState` (line 139-145), the transport is currently:

```ts
const walletClient = createSmartWalletClient({
  transport: alchemyWalletTransport({ apiKey: params.apiKey }),
  ...
});
```

Change to:

```ts
const transport = params.apiKey
  ? alchemyWalletTransport({ apiKey: params.apiKey })   // user-provided key
  : alchemyWalletTransport({ baseUrl: `${baseUrl}/aa/v1` }); // proxied

const walletClient = createSmartWalletClient({ transport, ... });
```

If `alchemyWalletTransport` doesn't accept a `baseUrl` override, use a plain
viem `http()` transport pointing at the backend proxy URL instead. The Alchemy
Wallet APIs client sends standard JSON-RPC — any HTTP transport works.

**File: `packages/client/src/aa/alchemy/resolve.ts`**

`resolveAlchemyConfig` currently throws if no API key is found. Change it to
return a sentinel (e.g. `apiKey: "__proxied__"`) when no user key is set but
the backend URL is available. The create function uses this to pick the proxied
transport.

**File: `packages/client/src/aa/env.ts`**

`hasAlchemyCredentials()` currently checks for `ALCHEMY_API_KEY` env var. It
should also return `true` when the backend proxy is available (i.e. always in
CLI context, since `baseUrl` defaults to `https://api.aomi.dev`).

**File: `packages/client/src/cli/execution.ts`**

`resolveCliAAApiKey` (line 97) returns `null` when no env var is set, which
causes AA to be skipped. Change it to return a proxy sentinel so the default
signing flow picks AA instead of falling through to EOA.

## What Does NOT Change

- `aomi sign` / `aomi tx sign` CLI interface — identical UX
- Signing flow: private key stays local, tx is signed client-side
- Backend notification after signing (step 4 in the flow)
- `--eoa` flag — still bypasses AA entirely
- User-provided `ALCHEMY_API_KEY` — still works, overrides proxy
- `PIMLICO_API_KEY` — unchanged, still direct
- Skill docs — AA section stays the same, just remove "requires ALCHEMY_API_KEY"

## Chain Slug Mapping

The client already knows the chain. Map `chainId` → Alchemy slug:

| chainId | slug |
|---------|------|
| 1 | `eth-mainnet` |
| 137 | `polygon-mainnet` |
| 42161 | `arb-mainnet` |
| 8453 | `base-mainnet` |
| 10 | `opt-mainnet` |
| 11155111 | `eth-sepolia` |

## Scope

- **Backend**: 1 new route (~50 lines), env var for Alchemy key
- **Client**: ~4 files touched, ~30 lines changed
- **Skill/docs**: minor update (remove ALCHEMY_API_KEY as required)
- **Risk**: low — additive change, existing user-key flow is untouched
