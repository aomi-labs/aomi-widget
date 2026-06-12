# Wallet Manual Test Results - 2026-06-12

Branch: `polish-multi-wallet`

Context: manual browser pass after the WalletRegistry refactor and the Para auth heal timing follow-up. Tester used real browser wallet extensions and the landing/demo app.

Related checklist: `docs/wallet-test-matrix.md`

Log attachment captured in Codex:

`/Users/aronmegyeri/.codex/attachments/dd6a4877-7b85-422f-8c34-2d9dfb36588d/pasted-text.txt`

## Summary

Most ordinary wallet persistence and switching paths look good. The main remaining regressions are:

- Para auth flow still disconnects external EVM wallets when opening the Para modal / Google login option, and cancelled login leaves the app with no connected wallet.
- Connecting MetaMask after Rabby is already connected appears broken; connecting Rabby after MetaMask works.
- Backend/model flows fail when wallets are connected. The attached logs show repeated `GET /api/state?... 400` responses with a connected EVM user state, and the model does not respond with wallets connected.
- Phantom EVM is auto-connected on a fresh MetaMask connect after clearing cache, which may be unexpected or an injected-provider/permission artifact.
- Minor UI flash when switching active wallet from Para to an external wallet.
- SVM cluster switch works, but triggers a popup and parts of the site refresh.

## Results

| # | Test / question | Expected | Result | Status |
|---|---|---|---|---|
| 1 | Fresh no-wallet load | No wallet connected, no popups, no active wallet ghost. | OK. | PASS |
| 2 | MetaMask connect + refresh after clearing cache | MetaMask connected and active after refresh, no unexpected wallets. | MetaMask connected, but Phantom EVM also connected immediately. After refresh, state stayed the same. | MIXED |
| 3 | Rabby connect + refresh | Rabby remains connected and active, label says Rabby. | OK. | PASS |
| 4 | MetaMask + Rabby multi-wallet switching | Can switch between connected EVM wallets; selected active wallet survives refresh. | Works well. Switching between all connected wallets works, including Phantom EVM. | PASS |
| 5 | Phantom EVM connect / persistence | Phantom EVM connects cleanly and does not merge with Solana Phantom. | Same issue as #2: Phantom EVM auto-connects unexpectedly. If disconnected manually, it stays disconnected after refresh and can connect freshly. | MIXED |
| 6 | Para Google login with no other wallets | Para appears connected and becomes active; no no-active-wallet state. | OK. | PASS |
| 7 | Para login cancel with external wallet connected | External wallet survives or silently reconnects; no extension popup. | Pressing Para in our modal, then reaching the Google sign-in option, disconnects the external wallet. Login was not completed. Wallets did not reconnect; app ended with no connected wallet. | FAIL |
| 8 | Para Google login with Rabby/MetaMask connected | No Rabby/MetaMask popup during Google auth; existing wallets stay connected. | No popup, but existing wallets did not stay connected. | FAIL |
| 9 | Para + external wallet active behavior | External wallet remains active after refresh; Para does not steal active. | Works. Minor UI issue: switching active from Para to external wallet causes a small flash under additional wallets, where they appear briefly. | PASS with UI note |
| 10 | Set Para active | Para remains active if explicitly selected. | OK. | PASS |
| 11 | Per-row Para sign out | Para stays disconnected after refresh; external wallet remains connected/active. | Works. | PASS |
| 12 | Per-row external disconnect / add MetaMask-Rabby paths | Disconnected wallet stays gone; other wallets remain. Adding wallets should work both directions. | Disconnect behavior works. Separate issue: Rabby -> add MetaMask is broken; pressing add MetaMask does nothing. MetaMask -> add Rabby works. May relate to Rabby picker asking whether to use Rabby or MetaMask. | MIXED |
| 13 | Disconnect all / family-wide sign out | All wallets gone including Para session; refresh stays clean. | OK. | PASS |
| 14 | Solana connect | Solana wallet remains connected after refresh. | OK. | PASS |
| 15 | Solana dismiss behavior | Dismissed popup should not keep re-popping automatically. | OK. | PASS |
| 16 | Solana disconnect | Solana wallet stays disconnected after refresh. | OK. | PASS |
| 17 | EVM network switch | One approval per switch, no flash loop, wallet remains connected. | Works. | PASS |
| 18 | SVM cluster switch | Confirm dialog appears, EVM wallets untouched. | Works, but there is a popup and parts of the site refresh for some reason. | PASS with note |
| 19 | Backend EVM tx with Para active | Signs/sends through Para path; tx complete event returns expected AA fields. | Ambiguous: reported "okay", but tester also reported all backend flows failed because the model does not respond with wallets connected. Needs re-test/clarification. | NEEDS RECHECK |
| 20 | Backend EVM tx with external active | Uses the active external wallet, not Para. | Failed as part of backend/model issue when wallets are connected. | FAIL |
| 21 | EIP-712 sign with chain mismatch | App switches chain first, then signs. | Failed as part of backend/model issue when wallets are connected. | FAIL |
| 22 | Backend Solana sign | Signs via Solana wallet adapter. | Failed as part of backend/model issue when wallets are connected. | FAIL |
| 23 | Privy route smoke test | `/privy` loads and basic wallet/auth state works. | Not explicitly reported in this pass. | NOT RUN |

## Backend / Model Regression

Tester note:

> All backend stuff failed because for some reason with wallets connected the model does not respond, but it does when it is not connected. It works in upstream code with wallets connected, so this branch likely broke something.

Relevant log evidence from the attachment:

```text
GET /api/state?user_state=... 400
POST /api/sessions 200
POST /api/chat 200
```

The repeated failing `user_state` payload includes:

```json
{
  "connection": {
    "is_connected": true,
    "provider": "para",
    "wallet_provider_subject": null,
    "auth_method": "wagmi",
    "auth_value": null,
    "auth_verified_at": null
  },
  "evm": {
    "address": "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
    "chain_id": 137,
    "sponsorship": {
      "sponsored": false,
      "sponsor_provider": "self",
      "sponsor_account": null
    }
  },
  "svm": {
    "address": null,
    "cluster": "solana:mainnet",
    "wallet_name": null,
    "transport": null,
    "capabilities": null
  },
  "ext": {
    "client_type": "web_ui"
  }
}
```

This suggests the next investigation should start at user-state serialization / backend validation for connected-wallet state, especially `connection.provider`, `auth_method`, `auth_value`, and `wallet_provider_subject`.

## Open Questions

1. Is Phantom EVM expected to auto-connect after clearing cache and connecting MetaMask, or is wagmi restoring an extension permission we should suppress?
2. During Para auth, why does opening the Google sign-in stage still produce a full external EVM disconnect with no silent recovery?
3. Is the delayed second-pass heal waiting too long, not firing, or suppressed by a later registry event after Para auth starts?
4. Why does Rabby -> add MetaMask no-op while MetaMask -> add Rabby works?
5. Is the Rabby wallet picker returning a different provider/connector identity when Rabby is already connected?
6. What route/validator rejects the connected-wallet `/api/state` payload with HTTP 400?
7. Is `auth_method: "wagmi"` with `provider: "para"` and `auth_value: null` valid for upstream, or did the refactor create an invalid combination?
8. Why does SVM cluster switching refresh parts of the page?
9. Should the brief additional-wallets flash when switching active wallet from Para to external be hidden by stabilizing the picker expanded/collapsed state?

## Priority Follow-Ups

1. Fix backend/model connected-wallet regression first, because it blocks all tx/sign request verification.
2. Fix Para auth external-wallet wipe / no-heal on cancelled login.
3. Fix Rabby -> add MetaMask no-op.
4. Decide whether Phantom EVM auto-connect is expected or a registry restore bug.
5. Clean up UI flash and SVM cluster refresh after core behavior is stable.
