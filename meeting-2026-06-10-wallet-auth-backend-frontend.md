# Meeting notes — 2026-06-10

## Source
- Transcript: `Meeting 2026-06-10_18-33-36_2026-06-10_16-33/transcripts.json`
- Window in transcript timestamps: `16:33:45` → `17:08:54`

## High-level summary
The team discussed a wallet-aware identity architecture for AOMI and how to split responsibilities between frontend and backend so users can link multiple wallets safely.

Core intent:
- Keep a **canonical user identity** as the source identity (e.g., email/provider identity),
- Link multiple wallets and providers to that identity,
- Ensure write actions are not allowed from linked wallets unless explicitly authorized, even when wallet addresses are known.

## 1) What they said in cleaner language
### Identity is cross-provider, not wallet-only
They described a case where one person signs in through one provider and later uses another account/provider. The point was that the system should still recognize those accounts as belonging to the same user if the linkage is established.

Important idea from the discussion:
- A database-level “read/write association” table should map identities (for example Gmail/Privy identity) to wallets and related accounts.
- A wallet like `0x...` should be treated as a credentialed account under that top-level identity, not as the whole trusted user on its own.

### Frontend: wallet UI and account switching are user-facing
They discussed where the UI should live:
- Users can connect a wallet, see all connected accounts, and switch context from settings/account selectors.
- Frontend should not assume that having a wallet connection automatically gives write authority.
- The UI should preserve this identity context (for example active account, write capability state) so behavior is predictable for end users.

### Backend: canonical identity resolution and protected execution
A major thread was about endpoint flow:
- The backend should be responsible for resolving an authenticated user context before protected actions.
- They repeatedly referenced resolving to one canonical user ID at request time (including the chat/runtime flow).
- The current resolution logic was described as a heavy middleware-like path they want to rethink for scalability and maintainability.

### Security: linking is not authorization
They raised an explicit impersonation risk:
- If a wallet gets linked and previously authorized with broad-ish session scope, another session can potentially use that same wallet context without proper direct consent.
- Suggested mitigation: requiring **authorized signer checks** / explicit approvals for high-risk actions.

This maps to adding a narrow permission model rather than relying on a single wallet-link as full permission.

### GitHub app + deployment automation flow
They also discussed one-click deploy from GitHub app flow:
- Install + callback flow must return to the correct page/endpoint.
- Scope and callback setup are important.
- The design direction is to keep deployment orchestration and CI lifecycle handling server-side.
- This reduces exposed attack surface versus scattering auth/deploy decisions across many external surfaces.

## 2) Cleaned transcript snapshots by topic
### Canonical user identity & account linking
- 16:33:45–16:34:06
  - They talk about different providers and why a central DB is needed because having access to data is not the same as being signed in.
- 16:35:19–16:37:33
  - They use example wallets (`0x...`) and explain that linked accounts can point back to one user identity.
- 16:39:10–16:40:31
  - They discuss storing all linked accounts and tracking whether we have write access to each.

### Native wallet/Frontend vs Backend behavior
- 16:38:04–16:38:58
  - Clarifies confusion: backend sees one thing, frontend actions another; user linking may be manual.
- 16:39:28–16:40:53
  - Distinguish between connection, account resolution, and permission state.
- 16:46:05–16:46:21
  - They mention finishing wallet switching UI first and then iterating.

### Security and approvals
- 16:41:16–16:42:38
  - They discuss impersonation risk and insist on direct signing/authorized signer constraints.
- 16:43:01–16:44:33
  - Concrete scenario with MetaMask session reuse and need for approval table/records.
- 16:45:04–16:45:31
  - They agree on checking approval state at runtime.

### Scaling backend resolution logic
- 16:49:21–16:51:24
  - Current chat request resolution path is central but may be too complex and too database-heavy.
- 16:52:16–16:53:12
  - They consider moving some resolution/query flow to a better boundary while preserving the same canonical user ID behavior.

### One-click deployment and callback handling
- 16:48:58–17:06:23
  - They discuss OAuth callback paths and GitHub app installation details.
- 16:06:20–17:07:56
  - Broad repository permissions and “one-click” repo operations are convenient but carry permission and setup implications.
- 17:07:25–17:08:10
  - They state backend-centric deployment orchestration shrinks attack surface by handling platform selection and CI lifecycle internally.

## 3) Practical design plan for your repo
### Data model (backend)
- `users` (or equivalent): canonical identity table.
- `linked_accounts`: row per provider connection, fields like `provider`, `provider_subject`, `provider_account_id`.
- `wallet_links` or `wallet_identities`: wallet addresses mapped to a canonical user.
- `wallet_approvals` / `action_approvals`: explicit consent records for sensitive operations.

### API boundary
- Add one clear identity resolution endpoint/middleware at request entry.
- Guarantee every protected request receives canonical user context (not raw wallet-only identity).
- Add policy checks for write actions: require approved signer and required auth level.

### Frontend app changes (`apps/landing`)
- Account and wallet management screen for linking/disconnecting/reordering accounts.
- Distinguish connected-but-unauthorized vs fully-approved wallets.
- Keep session state stable while switching accounts.
- Surface approval state and last approval timestamps in the UI.

### Backend logic priorities
- Introduce approval enforcement checks in transaction/agent action handlers.
- Keep deployment callbacks and OAuth handoffs strict and auditable.
- Move risky or broad write logic out of generic wrappers and into guarded backend services.

## 4) Actionable next steps
1. Finalize canonical identity schema and migration strategy.
2. Implement strict signer-based approval gating for write actions.
3. Update frontend settings to show wallet/provider linkage + capability state.
4. Harden GitHub callback path and verify with end-to-end manual flow (install, callback, return page).
5. Add regression checks for:
   - wallet switch between linked accounts,
   - removed/revoked access,
   - replay attempts with stale approval,
   - unauthorized wallet action blocked with clear error.
