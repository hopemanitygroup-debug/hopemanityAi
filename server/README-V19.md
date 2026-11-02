# HopeManity AI Trading V19 — Binance Spot Testnet

## Scope
BTCUSDT only. Virtual exchange balances. No production API endpoint and no real trading.
This phase implements a standalone read-only Node.js server. Trading is disabled by design.

## Architecture
iPhone/browser dashboard -> HTTPS authenticated API -> Node.js backend -> Binance Spot Testnet.
Only backend can hold API secrets. Never put keys in the frontend, commits, logs, or chat.
For deployment use a secret manager, HTTPS, private admin auth, rate limits and an IP allowlist where supported.

## Testnet
Official REST base: https://testnet.binance.vision/api
Official WebSocket market streams: wss://stream.testnet.binance.vision/ws
Testnet may reset balances/orders periodically.

## Running
Requires Node.js 20+ (native fetch). No third-party packages.

1. Copy `.env.example` to your local secret configuration. Do NOT commit actual secrets.
2. Set `HOP_ADMIN_TOKEN` to a long random secret; use `BINANCE_TESTNET_KEY` and `BINANCE_TESTNET_SECRET` only from the Spot Testnet portal.
3. Run `node server/v19-testnet.mjs`.
4. Test: `curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://127.0.0.1:8787/api/status`.
5. Optionally test signed read-only account balance: `/api/account` (only if testnet credentials are configured).

## Safety invariants
- Backend hostname hard-coded to Spot Testnet, no environment switch to production.
- No endpoint for order creation/cancellation.
- No live funds; no withdrawals; no futures.
- Trading signals and risk model are NOT enabled.
- All API routes require admin bearer token.
- API secrets never returned to client.
- Only BTCUSDT market data exposed.
- This server binds to localhost only; put authenticated TLS reverse proxy in front before remote access.
- Signed Binance requests use HMAC-SHA256 and a timestamp.
- For future trade-capable testnet stage: 1% max equity risk, position sizing, exchange filters, daily loss cap, idempotent clientOrderId, reconciled fills, durable DB, kill switch, audit log and explicit approval.
