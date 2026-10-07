# ELYNDRA ONLINE — instructions for Claude Code

Read this file first in every session. It carries the owner's standing rules and the current state of the project,
so work continues from where the previous sessions stopped.

## The owner

- Game owner: Joke. Replies **in short Thai**. Works mostly from a phone: prefers reports as **.html** (not .md).
- Wants finished work, not step lists: do the work, test it, deploy it, then report.
- Standing workflow for every change: **test → commit → push → update the live server → report the commit id**.
- When a task spec says "stop after X / don't start Y", stop there and wait.

## Never do

- Never overwrite, reset or delete player data: `data/elyndra.db`, `data/db.json` (legacy), `data/backups/`.
  Back up the database **before every deploy** (see Deploy).
- Never delete Windows/System32, AppData\Local\Packages, Node or Chrome on the VPS.
- Don't rewrite working systems — extend them. The server stays authoritative (client sends intents, server decides).
- Don't change internal ids / save keys: map id `lumira`, env `LUMIRA_DATA`, localStorage `lmo_*` keys,
  the file name `START-LUMIRA-ONLINE.bat`, skill / item / quest / portrait ids.
- Don't commit secrets (`.env`, `data/.session-secret`, `data/admins.txt`).
- Assets: only CC0 / CC-BY (commercial) or the owner's own art. No ripped game assets (no Ragnarok etc.).
  Record every new asset in `docs/ASSET_LICENSES.md` or `docs/VFX_ASSET_LICENSES.md`.
- Not started on purpose (wait for the owner): Market UI, PvP, Guild War, World Boss, Endgame, M4 Region 3.

## Project map

| Path | What |
|---|---|
| `server.js` | game server (HTTP + WebSocket, combat, AI, NPC, shops) |
| `engine/` | store.js (SQLite), migrate.js, gm.js, mail.js, social.js (party/guild/trade/rank), quests.js, status.js, config.js, log.js, limits.js, password.js |
| `content/` | data registries: items, monsters, maps, skills (+ skills2), classes, quests, npcs, shops, recipes, events, world — validated by `content/index.js` |
| `public/` | browser client: game.js, world.js, combat.js, hud.js, paperdoll.js, vfx.js (skill VFX registry), portraits.js, account.js (character select / GM / mail), social.js, audio*.js |
| `public/assets/` | art: vfx/, portraits/, skills/, branding/, ui/, lpc/ … (`import/` = untouched sources) |
| `tools/art/` | Python build scripts that turn source art into game assets (build_vfx.py, build_portraits.py, build_skill_icons.py, …) |
| `tests/` | `npm test` (all suites, ~20 min), `node tests/run.js <suite>`, `npm run test:load` |
| `docs/` | DEVELOPMENT_ROADMAP.md (status of every milestone), CONTENT_MATRIX.md, DATABASE_MIGRATION_PLAN.md, PRODUCTION_SETUP.md, VFX_ASSET_MATRIX.md, licences |

Key facts: tile = 32 art px; maps use tile codes from `engine/mapgen.js`; the client draws everything on one canvas
(pixel art, LPC characters); skills point at VFX ids (`castVfx/projectileVfx/hitVfx/areaVfx`), never image paths;
characters store `portraitId` only; 1 account = up to 3 characters; roles PLAYER / GM / ADMIN live in the database.

## Current state (2026-10-07)

Done: M1 cleanup · M2 Verdant Wilds (Lv20-45) · M3 second-class skills · rebrand to ELYNDRA + new login ·
VFX Phase 1 (basic + first-class skills) · character portraits · Pre-Public Foundation (SQLite, bcrypt, sessions,
rate limits, GM/ADMIN + ban/mute + audit log, multi-character + character select, mail/friend/market foundation,
backups, /health, HTTPS-ready) · second-class LPC outfits (12 classes, own class layer + back item: capes,
wings, packs; `tools/art/lpc/build_chars.py`, LPC_ROOT = blobless clone of the Universal LPC repo) · VFX Phase 2
(all 60 active second-class skills + level-up / monster death / walk dust; effects drawn 1.7x) — deployed 2026-10-07.
Last commit: see `git log`.

Art direction notes from the owner (2026-10-07): likes the LPC look extended with library parts; procedurally drawn
art (tools/art/characters_hd.py, the HD set) was judged too simple — keep it only as a fallback. No free asset pack
found that matches "HD anime MMORPG" with all classes (reviewed list: ElyndraArt Assets/Art/HD_Pixel_Assets/ASSET_LICENSES.md).
Monsters still reuse 24 LPC sheets for 91 monsters (open item).

Waiting on the owner:
1. Review VFX Phase 1 + 2 in game.
2. A domain for HTTPS (Caddy + `.env` production — steps in `docs/PRODUCTION_SETUP.md`). Until then the game runs
   as http://168.222.28.53:3400 in development mode — don't open it to the public yet.
3. Next milestone from the roadmap: M4 Region 3 Ashen Frontier (Lv40-65), then Market (M6).

## Deploy (Windows VPS)

- Live folder: `C:\Users\Administrator\Downloads\RO2021\LUMIRA-ONLINE` (runs `RUN-SERVER.bat`, Node 24, port 3400).
- Git: repo `anuwatgamerz-debug/LUMIRA-ONLINE`, branch `claude/sharp-euler-s0qm8s`.
1. Back up first: `node scripts/backup-database.js` (or copy `data\elyndra.db` to `Downloads\LUMIRA-DB-BACKUP\`).
2. Copy changed tracked files into the live folder — **never** `data/`, `node_modules/`, `.git/`.
3. Restart: create an empty file `RESTART-REQUEST` in the live folder; wait ~30 s.
4. Check `logs\server.log` ends with `ELYNDRA ONLINE running on ...` and the character count is unchanged.

## Unity art pipeline (Unity is for making images, not a new client)

The game stays a web game (canvas + sprites). Unity is used as an **art studio**: build / pose / light 3D or 2D
scenes in the Unity Editor and export PNG sprite sheets, portraits, skill icons, VFX frames and backgrounds into
this repo. Claude Code drives the Unity Editor through **MCP for Unity** (CoplayDev, MIT):
Unity → Package Manager → Add from git URL `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`,
then `Window → MCP for Unity → Configure All Detected Clients` (needs Python 3.10+ / uv). Run Claude Code on the
same computer as the Unity Editor.

Rules for Unity output:
- Unity project lives outside this repo (e.g. `ElyndraArt/`); only exported images come here.
- Export to `public/assets/import/unity/<kind>/` (untouched exports), then a `tools/art/` script converts them to the
  game format (size, WebP, sheet layout) — same pattern as build_vfx.py / build_portraits.py.
- Match existing formats: tile 32 px, LPC-style character frames (64 px cells, 4 directions), skill icons as in
  `public/assets/skills/`, VFX as white+alpha textures tinted in `public/vfx.js`, portraits 1254 px busts.
- Art direction: Fantasy anime / HD pixel, Deep Navy · Gold · Celestial Blue; every asset must feel like one game.
- Only use Unity Asset Store / third-party models whose licence allows commercial use in a game; log them in
  `docs/ASSET_LICENSES.md`. Unity Personal licence rules apply to the owner.
- Show the owner a preview (contact sheet .html / .png) before replacing art that players already see.
