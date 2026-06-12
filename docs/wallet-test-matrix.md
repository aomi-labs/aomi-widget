# Wallet Manual Test Matrix

Baseline and phase-specific wallet checks for the wallet registry refactor.
Preview tools cannot install wallet extensions, so these rows are intended for
manual browser runs with the relevant extensions/accounts available.

Dev server:

```bash
pnpm run dev:landing:live
```

Debug tracing:

```js
localStorage["aomi.wallet.debug"] = "1";
```

Filter browser console output for `[aomi-wallet]`.

| ID | Scenario | Expected | Needs extensions | Baseline | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 | Phase 9 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | Fresh load -> connect MetaMask -> refresh | MM connected + active after refresh, no popups | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M2 | Connect MetaMask + Para (Google) -> set MM active in picker -> refresh | MM stays active; Para still connected; no flapping (watch `[aomi-wallet]`) | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M3 | With Para active, click MetaMask row once | Switch sticks on first click, no revert | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M4 | Rabby connected -> sign in with Para (Google) | Rabby survives (or auto-heals <=2s); no MM/Rabby extension popups beyond the 2-budget | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M5 | Para + MM connected -> per-row sign out Para | MM survives; refresh -> Para stays signed out, MM intact | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M6 | Two EVM wallets -> per-row disconnect one -> refresh | Disconnected one stays gone, other intact | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M7 | Phantom-EVM connect from picker | Connects on first click | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M8 | Phantom-Solana connect; then retry after dismissing the popup | First click works; dismiss does not re-pop the popup | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M9 | EVM network switch (Base -> Arbitrum -> Base) | Wallet approves, no flash loop, switcher stays alive, no -32002 duplicate popups | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M10 | SVM cluster switch (Mainnet -> Devnet) | Confirm dialog, reconnect works, EVM untouched | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M11 | Backend tx request -> EVM send (Para embedded, sponsored if env set) | Tx executes, AA fields in result; check `wallet_tx_complete` in network tab | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M12 | Backend tx request -> EVM send with external wallet active | EOA or 4337 path executes with the active wallet, not Para | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M13 | Backend EIP-712 request with different `domain.chainId` | Auto chain-switch, then signs | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M14 | Backend Solana sign request | Signed via wallet-adapter | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M15 | Rabby + MetaMask both installed, both connected | Correct brand per row, one row per address, per-row disconnect surgical | Yes | Not run | N/A |  |  |  |  |  |  |  |  |
| M16 | `disconnect({ family: "all" })` (picker "sign out" all) | Everything gone including Para session; refresh stays clean | Yes | Not run | N/A |  |  |  |  |  |  |  |  |

