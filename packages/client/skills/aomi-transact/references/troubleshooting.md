# Troubleshooting

Read this when a command fails unexpectedly or behaves differently than the workflow predicts.

## Chat / Session

- If `aomi chat` returns `(no response)`, wait briefly and run `aomi session status`.
- If `aomi session status` shows the session is gone, the local pointer may be stale — retry with `--new-session`.

## Signing

- If AA signing fails, the CLI tries the alternative AA mode automatically. If both modes fail, it returns an error suggesting `--eoa`. Read the console output before retrying manually.
- If AA fails with a credential error, stop and ask the user to check their provider configuration on their side. Do not try to configure it from the skill.
- If a transaction fails on-chain, check the RPC URL, balance, and chain.
- If the signer address differs from the stored session public key, the CLI updates the session to the signer address and continues — this is expected, not an error.

## RPC

- `401`, `429`, and generic parameter errors during `aomi tx sign` are usually RPC problems, not transaction-construction problems. Pass a reliable chain-matching public RPC via `--rpc-url`.
- If one or two public RPCs fail for the same chain, stop rotating through random endpoints and ask the user to supply a proper RPC URL for that chain themselves. Do not paste provider-keyed URLs into chat.
- The pending transaction already contains its target chain. If the default RPC is wrong, override with `--rpc-url` for the matching chain.

## Simulation

- If `aomi tx simulate` fails with a revert, read the revert reason. Common causes: expired quote or timestamp (re-chat to get a fresh quote), insufficient token balance, missing prior approval. Do not sign transactions that failed simulation without understanding why.
- If `aomi tx simulate` returns `stateful: false`, the backend could not fork the chain — simulation ran each tx independently via `eth_call`, so state-dependent flows (approve → swap) may show false negatives. Retry, or check that the backend's Anvil instance is running before signing.

## Cross-chain

- When the chat/session chain (`--chain`) differs from the chain the agent eventually queues a tx for, that's normal — the user may have asked for a cross-chain operation. Sign with `--rpc-url` matching the *queued tx*'s chain, not the session chain.
