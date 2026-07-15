# Cross-domain widget consumer

This Vite app is deliberately served from `http://127.0.0.1:5174` while
Portal runs on `http://127.0.0.1:3000`. There is no same-origin proxy and no
cookie bridge.

```bash
cp apps/widget-consumer/.env.example apps/widget-consumer/.env.local
pnpm --filter widget-consumer dev
```

Connect an EVM wallet. The first authenticated Portal request displays a SIWE
message for the consumer origin, then keeps the returned Widget Session Token
in memory. Network requests to Portal use `Authorization: Bearer aomi_wst_...`
with `credentials: omit`.
