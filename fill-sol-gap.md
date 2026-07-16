# Solana HTTP delivery gap — resolved

Resolved and verified locally on 2026-07-15. This document records the failure
chain and the acceptance evidence; it is no longer an open debugging guide.

## Root causes

The backend did create and persist `TxApproval::Svm`, but the wallet-broadcast
approval lacked the serialized `unsigned_tx`. The durable approval therefore
contained staged instructions but no bytes an external wallet client could
sign.

The TypeScript client then rejected or lost the approval in three places:

- SVM approvals serialize with `chain_family: "svm"`; normalization only read
  `chain_kind`.
- only `solana_sign` requests were converted to CLI pending transactions;
  `solana_send` / `solana_sign_and_send` were ignored.
- a later authoritative user-state sync replaced the event-derived unsigned
  transaction with `pending.svm_ixs`, whose semantic records intentionally do
  not duplicate `unsigned_tx`.

The TS CLI's Solana branch was also sign-only. Wallet-broadcast requests now
sign, submit through the selected RPC, wait for confirmation, and report the
canonical `wallet:tx_complete` callback with every `pending_svm_tx_id`.

## Regression coverage

- Backend commit envelopes carry `unsigned_tx` and `request_kind` through the
  materialized `SvmTxApproval` event.
- Client normalization accepts both `chain_kind` and tagged `chain_family`.
- `svm_ix_ids` / `svm_tx_ids` are preserved for terminal backend cleanup.
- Event-derived unsigned transactions survive user-state refresh while their
  staged ids remain authoritative, and disappear after backend cleanup.
- The CLI supports sign-only, send, and sign-and-send Solana requests.

## Live acceptance evidence

Against the local Rust backend and Surfpool devnet fork, a fresh TS CLI session
using `google/gemini-3-flash-preview` completed:

1. `svm_get_context` resolved `http://127.0.0.1:8899` and the connected wallet.
2. Gemini staged canonical System Program transfer bytes
   `AgAAAEBCDwAAAAAA` for 1,000,000 lamports.
3. LiteSVM simulation succeeded at 450 compute units.
4. `svm_commit_ix` emitted a wallet approval with serialized unsigned bytes.
5. `aomi tx list` showed `tx-1` after an authoritative backend-state refresh.
6. `aomi tx sign tx-1` signed, broadcast, and confirmed signature
   `3X3XNp7hNQcB68YLuuXLM1vhHat7W4RfVzW5GDgKiibt1QrrHRnKSQFT3CSwbSF5qtD3VFmhjCz2dnTrekHrW2mJ`.
7. Backend pending state cleared and the recipient balance moved from
   20,000,000 to 21,000,000 lamports.

This closes the original minimal acceptance target. Portal/browser work remains
separate and is intentionally not part of this backend/CLI verification.
