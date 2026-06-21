# V2 UserState e2e matrix

Goal: every (provider × auth × aa-mode × tx-shape) combo that maps to a
distinct `UserState` shape, run through the actual client code, and assert
the post-tx wire snapshot matches.

Backend in scope: the staging API at https://api-staging.aomi.dev. Note
that **the new fields (`smart_account_4337`, `delegation_7702`,
`wallet_kind`, `wallet_provider`, `auth_method`, `sponsored`,
`sponsor_provider`, `sponsor_account`, `svm_address`) are currently
dropped by the backend** until product-mono#492 deploys. So each cell
records both:

- **OUT** — what the client SENDS to `/api/chat?user_state=…` (captured by
  wrapping `globalThis.fetch`).
- **ECHO** — what the backend RETURNS from `/api/state` (post-fix
  expectation; until then, the new fields read `null`).

## A. CLI (5 cells)

CLI EOA address ≠ smart account address ⟹ `wallet_kind: "eoa"` always.
Local signing uses `BANANA_PRIVATE_KEY` (`0x5D907BEa…`) on
anvil forks: Ethereum @ `http://127.0.0.1:56393`, Base @
`http://127.0.0.1:56421`. Both pre-funded with 100 ETH.

| ID | Mode | OUT (chat user_state) | OUT (post-tx) | ECHO post-fix |
|----|------|----------------------|---------------|---------------|
| C1 | `--eoa` (no AA) | address, chain_id, is_connected=true, aa_mode="none", wallet_kind="eoa", ext.client_type=ts_cli | aa_mode="none", smart_account_4337=null, delegation_7702=null | same |
| C2 | `--aa 4337` Alchemy + gas policy (sponsored) | + aa_mode="4337" | aa_mode="4337", smart_account_4337=SA, delegation_7702=null | + sponsored=true, sponsor_provider="alchemy" if forwarded |
| C3 | `--aa 4337` Alchemy unsponsored | + aa_mode="4337" | aa_mode="4337", smart_account_4337=SA, delegation_7702=null | + sponsored=false |
| C4 | `--aa 7702` (EOA pays gas) | + aa_mode="7702" | aa_mode="7702", smart_account_4337=null, delegation_7702=DEL | same |
| C5 | `--aa-provider pimlico --aa-mode 4337` | + aa_mode="4337" | aa_mode="4337", smart_account_4337=SA, delegation_7702=null | same |

**Local-fork-broadcastable:** C1, C4. **Bundler-required:** C2, C3, C5
(would hit Alchemy/Pimlico mainnet bundler — skip live broadcast, verify
client wire only).

## B. Base Account (3 cells)

All Base Account flows are 4337 by definition; `wallet_kind: "smart-account"`.
Driven through `/apps/base` (Next.js) + the `AomiBaseAccountProvider`.

| ID | Sponsorship mode | OUT (chat) | OUT (post-tx) |
|----|-----------------|------------|---------------|
| B1 | `mode: "disabled"` (self-pay) | wallet_provider="baseAccount", wallet_kind="smart-account", aa_mode="4337", sponsored=undefined | + smart_account_4337=SA, delegation_7702=null, sponsored=false |
| B2 | `mode: "optional"` | + sponsored=true, sponsor_provider="coinbase" | + sponsored=true (or undefined if optional fell back) |
| B3 | `mode: "required"` | + sponsored=true, sponsor_provider="coinbase" | + sponsored=true |

## C. Para (8 cells)

Para's actual auth dimensions: signer-kind {OAuth-embedded vs External-wagmi},
chain {EVM vs Solana vs both}, tx-shape {single vs batch}, sponsorship
{alchemy-gas-policy vs none}.

| ID | Signer | Chain | Tx-shape | Sponsorship | OUT post-tx |
|----|--------|-------|----------|-------------|-------------|
| P1 | OAuth (google) | EVM | single | none | aa_mode="none", wallet_kind="eoa", wallet_provider="para", auth_method="google" |
| P2 | OAuth (google) | EVM | batch | none | aa_mode="7702", delegation_7702=DEL, wallet_kind="eoa", … |
| P3 | OAuth (google) | EVM | batch (7702 fail → 4337) | none | aa_mode="4337", smart_account_4337=SA |
| P4 | OAuth (google) | EVM | batch | Alchemy gas policy | + sponsored=true, sponsor_provider="alchemy", sponsor_account=gp_id |
| P5 | External (wagmi/QR) | EVM | single | none | aa_mode="none", auth_method="wagmi" |
| P6 | External (wagmi/QR) | EVM | batch | none | aa_mode="4337", smart_account_4337=SA (forced; external can't do 7702) |
| P7 | OAuth (google) | Solana | single | n/a | svm_address=base58, auth_method="google", aa_mode=none |
| P8 | OAuth (google) | EVM+Solana dual | mixed | none | address + svm_address both present |

## D. Disconnect / wallet-switch (2 cells)

| ID | Action | Expected post-action UserState |
|----|--------|--------------------------------|
| D1 | session active → call disconnect() | is_connected=false, address=undefined, wallet_kind/aa_mode/smart_account_4337/delegation_7702/wallet_provider/auth_method/sponsored/sponsor_provider/sponsor_account/ens_name=undefined |
| D2 | connected addr A → reconnect addr B (no disconnect between) | address=B, chain_id preserved, wallet_provider/wallet_kind/auth_method/sponsored preserved, BUT aa_mode/smart_account_4337/delegation_7702/ens_name/pending_*=undefined |

Total: **5 (CLI) + 3 (Base) + 8 (Para) + 2 (D) = 18 cells.**
