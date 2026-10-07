# ELYNDRA ONLINE — Production setup (HTTPS / WSS on the Windows VPS)

The game server keeps running on `127.0.0.1:3400`; **Caddy** in front of it terminates HTTPS on port 443
(free certificates from Let's Encrypt, renewed automatically) and forwards both the page and the WebSocket.

```
Player ── https://play.DOMAIN (443) ──> Caddy ──> http://127.0.0.1:3400 (game server)
       └─ wss://play.DOMAIN ─────────────┘   (same address; the client builds wss:// from https:)
```

## What is already done in the code

* Client WebSocket URL follows the page: `https:` → `wss://`, `http:` → `ws://` (localhost development keeps HTTP).
* `NODE_ENV=production` → plain-HTTP requests are redirected to HTTPS (`FORCE_HTTPS`, localhost excluded), HSTS on HTTPS.
* `TRUST_PROXY=1` → real client IP / scheme from `X-Forwarded-*` (rate limits work per player, not per proxy) and the
  server binds to `127.0.0.1` so it is reachable only through Caddy.
* `SESSION_SECRET` is required in production (session tokens are stored as HMACs).
* `/health` → `{status, uptime, database, playersOnline}` for uptime monitors (no secrets).

## Steps (needs a domain)

1. **DNS**: create an A record `play.YOURDOMAIN` → `168.222.28.53`.
2. **Caddy**: download `caddy_windows_amd64.exe` from https://caddyserver.com/download, rename to `caddy.exe`,
   put it in `C:\caddy\` with `deploy/Caddyfile` (replace `play.example.com`).
3. **Firewall**: allow inbound TCP 80 and 443 (`netsh advfirewall firewall add rule name="ELYNDRA HTTPS" dir=in action=allow protocol=TCP localport=80,443`).
4. **Run Caddy** as a scheduled task / service: `C:\caddy\caddy.exe run --config C:\caddy\Caddyfile`
   (Task Scheduler: "At startup", "Run whether user is logged on or not").
5. **.env** next to `server.js` (copy `.env.example`): `NODE_ENV=production`, `TRUST_PROXY=1`,
   `PUBLIC_URL=https://play.YOURDOMAIN`, a long random `SESSION_SECRET`, `ADMIN_ACCOUNTS=<your login>`.
6. Restart the game server (create `RESTART-REQUEST`). Open `https://play.YOURDOMAIN` — the lock icon must show.
7. When HTTPS works, remove the firewall rule for port 3400 ("LUMIRA ONLINE 3400") so the game is only reachable via HTTPS.

Until a domain exists the server keeps working as today (`http://168.222.28.53:3400`, development mode).
