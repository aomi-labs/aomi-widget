# MCP Chat Parity — Plan

> **Implementation status (2026-08-13): complete and live-chain verified.** Phases
> 1–5 are implemented in the Portal MCP route/server modules. The primary route
> exposes the four chat tools, the direct funnel is preserved at
> `/api/mcp/direct`, manual wallet requests have a redacted portal handoff, and
> the shared origin-scoped OAuth metadata covers both endpoints. The local E2E
> smoke proves SIWE, OAuth registration/PKCE/consent/refresh, chat/check/list/
> resume/interrupt, a real staged manual-wallet transaction, and the browser
> handoff into the owning transcript. A fresh Codex process completed OAuth and
> used the four-tool surface; the funded SIWE wallet then imported the MCP
> thread into the CLI, signed its pending Base transaction, and returned both
> confirmed transaction hashes through `aomi_check`.

> Goal: the MCP server exposes the **agent path** — the upper agent (Claude,
> ChatGPT, …) chats with the Aomi agent the same way the TS CLI does — instead
> of bare tool calls. The current tool-funnel MCP moves to an alternative
> route and becomes the seed of the future "direct tools" path (out of scope
> here beyond the move).
>
> Decisions locked with Attila (2026-08-12):
>
> 1. **Async turn model** — `aomi_chat` fires the turn and returns; the upper
>    agent follows progress with `aomi_check` (rich deltas, not a bare
>    "not done" flag) and can `aomi_interrupt`. Subagent-style ergonomics.
> 2. **Signing** — investigated remote signing (see §4): server-side signing
>    via the `sign` crate (Privy delegated / Para agent wallets) is live and
>    proven; onboarding (connect + arm) is interactive. MCP surfaces pending
>    wallet requests + handoff; no signature-submission tool in v1.
> 3. **Routes** — chat MCP takes over `/api/mcp`; funnel moves to
>    `/api/mcp/direct`.
> 4. **Threads** — `aomi_chat` takes an optional `session_id`; omitted means
>    a new session is created and returned. `aomi_list_sessions` queries
>    existing threads. No separate create-thread tool.

## 1. Where things stand

**TS CLI chat path** (`packages/client/src/cli`, `src/session`):
`CliSession` → `ClientSession` → `AomiClient` → backend
`POST /api/thread/chat` (fire) → poll `GET /api/thread/state` until
`is_processing` clears → wallet requests arrive via user_state/system events →
`aomi tx sign` posts the signature back with `POST /api/system`.

**Current MCP** (`apps/portal/src/app/api/mcp/route.ts` +
`src/server/mcp/{tools,backend,session,thread}.ts`): stateless streamable-HTTP,
one JSON-RPC message per POST, `withMcpAuth(auth, …)` (better-auth OAuth),
`resolveMcpCanonicalUser` → `mintAccountBearer` per backend call, deterministic
`mcp-<uuidv5>` thread, 10-tool discovery funnel hitting `/api/resource/*` and
`/api/exec/*`.

**Auth is unchanged by this plan.** OAuth handshake, canonical-user
resolution, and AccountBearer minting stay exactly as the MCP does today.
CLI-style SIWE/SIWS is not part of the MCP path.

## 2. Target tool surface (4 tools)

All tools are backed by the same backend endpoints the CLI uses, called
server-side from the portal BFF with a minted AccountBearer and the session id
as the thread id (same Cloudflare-worker rendezvous routing as portal chat).

### `aomi_chat`

- args: `message` (required), `session_id` (optional), `app` (optional).
- `session_id` omitted → generate a fresh `mcp-<uuid>` id, ensure the
  account-bound thread exists (CLI's `ensureAccountBoundThread` equivalent),
  and return it. Provided → continue that thread (any account-owned thread id
  from `aomi_list_sessions` works, including past MCP sessions).
- Behavior: `POST /api/thread/chat`, return immediately with
  `{ session_id, status: "processing", cursor }` (plus the final reply inline
  when the backend happened to answer synchronously). The tool description
  tells the model to follow up with `aomi_check`. The cursor includes its
  `session_id`, so an MCP client can pass it unchanged without reconstructing
  arguments from sibling result fields.

### `aomi_check`

- args: `cursor` (optional, from the previous chat/check result — the server is
  stateless, so the cursor round-trips through the caller; session id +
  message-count + system-event offset). A top-level `session_id` remains
  accepted for compatibility with older/count-only cursors.
- Behavior: `GET /api/thread/state`; returns a **delta**, not the transcript:
  `{ status, new_messages, activity, pending_requests, title, cursor }`.
  - `activity`: compressed tool/task narration, same events the CLI's verbose
    mode prints (`tool_complete`, `task_started`/`task_activity`/
    `task_completed`) — this is what makes the check loop feel like
    supervising a subagent rather than polling a flag.
  - `status`: `"processing"` | `"complete"` | `"awaiting_user"` (pending
    wallet request present).

### `aomi_interrupt`

- args: `session_id`. `POST /api/thread/interrupt`. Parity with CLI Ctrl-C /
  `session.interrupt()`.

### `aomi_list_sessions`

- args: `limit?`. `GET /api/threads` (account-bound), returns
  `{ id, title, updated_at }` rows so the agent can resume past conversations.

App/model selection are parameters/instructions, not tools — keeps the surface
at 4. (BYOK `/key`, secrets, deploy etc. stay CLI-only for now.)

Server `instructions` (initialize result) describe the loop: chat → check
until `complete`/`awaiting_user` → relay pending requests to the human.

## 3. Route + file moves

| What                      | From                                         | To                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Funnel tools + dispatcher | `src/server/mcp/tools.ts` (+`tools.test.ts`) | unchanged file, re-exported by new route                                                                                                                                                                               |
| Funnel endpoint           | `POST /api/mcp`                              | **new** `src/app/api/mcp/direct/route.ts` (same `withMcpAuth` wrapper, same JSON-RPC shell)                                                                                                                            |
| Chat endpoint             | —                                            | `src/app/api/mcp/route.ts` swaps `MCP_TOOLS`/`dispatchTool` for the chat set                                                                                                                                           |
| Chat tool defs + dispatch | —                                            | **new** `src/server/mcp/chat-tools.ts`                                                                                                                                                                                 |
| Thread-kernel calls       | —                                            | **new** `src/server/mcp/chat-backend.ts`: `sendChat`, `fetchState`, `interrupt`, `listThreads`, `ensureThread` — mirrors `backend.ts`'s mint-bearer pattern but against `/api/thread/*`, `/api/system`, `/api/threads` |
| JSON-RPC shell            | inline in `route.ts`                         | extract to `src/server/mcp/rpc.ts` so both routes share initialize/ping/tools-list/error plumbing                                                                                                                      |

The shared JSON-RPC shell keeps the two endpoints byte-compatible in
transport behavior (stateless, one message per POST, 202 for notifications,
405 GET/DELETE).

## 4. Signing over MCP (research findings, 2026-08-12)

Server-side ("remote") signing in `product-mono/aomi/crates/sign` is **done
and live-proven**, not a stub:

- Privy delegated EVM wallets at `signing_mode = auto`: stage → commit signs
  server-side and broadcasts (plain EOA and AA lanes). Proven on MegaETH
  mainnet (`memory/2026-08-04.md`). SVM auto works via venue/BroadcastEngine.
- Crons already run fully headless turns through the same gate — `auto` keys
  complete unattended; `manual` keys halt at `PendingApproval` by design.
- Para REST signing is code-complete but **off unless `PARA_SECRET_API_KEY`
  is deployed** (per 2026-07-31 handoff, likely unset).
- The one-time onboarding is inherently interactive: browser connect
  (`ask_authorization` returns a URL a human must open) + a permit signature
  by the wallet itself to arm `auto`.

Consequences for the MCP chat path:

1. **No signing tools needed in v1.** For an armed (`auto`) wallet the turn
   completes end-to-end and `aomi_check` just reports `complete` with tx
   hashes. Onboarding happens _in the conversation_: the Aomi agent's own
   `ask_authorization` tool returns the connect URL, which the upper agent
   relays to the human — MCP is a pure text conduit for that.
2. **`manual` wallets stall at `awaiting_user`.** `aomi_check` returns the
   pending request payload (to/value/chain or EIP-712 summary, same fields the
   CLI prints) plus handoff guidance: sign in the portal, or
   `aomi tx sign <id>` from a CLI logged into the same account after
   `aomi session resume <session_id>` imports the account-owned MCP thread.
3. **v2 (explicitly deferred):** an `aomi_resolve_request` tool that accepts a
   signed tx / signature and posts the wallet system event — the `client_auto`
   role `aomi tx sign` plays — for callers that hold keys locally (e.g. Claude
   Code with a wallet skill).

## 5. Backend integration points to verify during implementation

- **user_state hydration for headless chat threads.** The exec path seeds the
  account's primary EVM key server-side
  (`bin/backend/src/endpoint/thread/exec_env.rs:133-162`); confirm
  `/api/thread/chat` threads created by the MCP get equivalent hydration (or
  have `chat-backend.ts` build a minimal `user_state` from the account graph's
  `public_keys`, like the portal's `DelegatedWalletHydrator`).
- **Session header name + worker routing.** The client uses a session header
  on `/api/thread/*` while `backend.ts` sets `x-thread-id` on `/api/exec/*`;
  confirm the Cloudflare worker hashes both to the same replica choice.
- **Account-bound thread creation.** Mirror the CLI's
  `client.createThread(sessionId)` before first chat on a new session.
- **OAuth protected-resource metadata for `/api/mcp/direct`.** Existing
  clients of `/api/mcp` get the chat surface automatically; check whether the
  direct route needs its own `.well-known/oauth-protected-resource/...`
  document or can share the current one.
- **Old deterministic thread.** The funnel's per-user `mcpThreadId(user)`
  default stays reachable via `aomi_list_sessions` → `session_id`; nothing
  migrates.

## 6. Phases

1. **Move the funnel** — add `/api/mcp/direct/route.ts`, extract `rpc.ts`,
   keep `tools.ts`/`backend.ts` untouched; port `tools.test.ts` route-level
   assertions.
2. **Chat backend helpers** — `chat-backend.ts` (+ tests mirroring
   `backend.test.ts`).
3. **Chat tools** — `chat-tools.ts` defs + dispatch + cursor/delta logic
   (+ tests: new-session creation, cursor deltas, status mapping, activity
   compression); swap into `/api/mcp`; new `instructions` string.
4. **Wallet-request surfacing** — payload shaping for `awaiting_user`
   (reuse the CLI's pending-tx field selection), portal handoff link; verify
   the §5 hydration item end-to-end against a real staged tx.
5. **Docs + state** — update `specs/mcp-design.md` pointer, `specs/STATE.md`,
   and the MCP connect page copy if it mentions the funnel workflow.

Out of scope: the non-chat "direct tools" path beyond the move, general CLI
changes beyond remote MCP-thread import, SSE push transport,
`aomi_resolve_request` (v2).
