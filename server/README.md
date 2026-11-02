# HopeManity V19 — Binance Spot Testnet backend (read-only phase)

Node.js 20+ with built-in modules; no external packages. This is a **server**, not a GitHub Pages app.

## Local setup
1. Copy `.env.example` to `.env` and enter **Testnet-only** API credentials. Do not commit `.env`.
2. Set a long random `DASHBOARD_TOKEN` in your private environment.
3. Export the environment variables from your private secret manager (Node does not auto-load `.env`).
4. Run `npm run check` then `npm start`.
5. `curl http://127.0.0.1:8787/health` should return ordersEnabled:false.
6. Call `GET /api/market` or `GET /api/account` with header `Authorization: Bearer YOUR_DASHBOARD_TOKEN`.

### Security boundaries
- **Hardcoded Testnet hostname**; no production URL configuration.
- **GET only**. No order endpoints or API order permissions required for this stage.
- No CORS headers, no public dashboard, binds to loopback by default.
- Signed private account requests are performed on the server, never in the browser.
- Avoid putting keys in frontend code, GitHub commits, URLs, screenshots or chat.
- To run remotely, deploy behind HTTPS reverse proxy with authentication, firewall and secret manager.
- Use restricted Testnet credentials; disable withdrawals; keep live credentials separate.
- Spot supports BUY/SELL, not leveraged futures SHORT positions.
- Add order placement only after explicit approval, tests, idempotency and kill-switch.

Official docs: https://github.com/binance/binance-spot-api-docs/blob/master/testnet/general-info.md
