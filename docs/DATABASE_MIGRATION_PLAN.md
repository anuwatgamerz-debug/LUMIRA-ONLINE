# ELYNDRA ONLINE — Database Migration Plan (db.json → SQLite)

Pre-Public Foundation, Phase 1 audit. Written before any migration code; describes the system as it is in commit
`a9d21fc`, the risks found, and the plan that the following commits implement.

## 1. What is in `data/db.json` today

One JSON file, loaded fully into memory at start, written back whole every 15 s when something changed
(`saveDb`: write `db.json.tmp` → copy old file to `db.json.bak` → rename). Top level:

```
{ "accounts": { "<login>": Account, ... }, "guilds": { "<name>": Guild, ... } }
```

Live server (VPS, 2026-10-07): 2 accounts, 2 characters, no guilds.

### Account (key = login id)

| Field | Meaning |
|---|---|
| key | `abc_123` (3–16 a-z0-9_), an e-mail, `guest:<16 hex>` or `google:<sub>` — lower-case, also the only account id |
| `salt`, `hash` | scrypt(password, salt, 32 bytes) hex — Node default cost (N=16384, r=8, p=1). Empty for guest / Google |
| `guest` | 1 for guest accounts |
| `google` | e-mail (or 1) for Google accounts |
| `tokens` | "remember me" sessions: `[{ h: sha256(token), exp }]`, max 5, 30 days |
| `created` | ms timestamp |
| `char` | **the one character** (1 account = 1 character) |

### Character (`account.char`)

| Group | Fields |
|---|---|
| identity | `name` (unique, case-insensitive, checked by scanning all accounts), `look {hair,hc,cc,sex}`, `portraitId` |
| progress | `lv`, `exp`, `cls`, `jlv`, `jexp`, `pts`, `st {str,agi,vit,int,dex,luk}`, `sk2 {skillId: lv}` |
| position | `map`, `x`, `y`, `dir`, `save {map,x,y}` |
| state | `hp`, `sp` (+ derived `maxhp`, `maxsp`, `atk`, `def`, … recomputed by `derive()`, not real data) |
| items | `inv [{id,q}]` (max 40), `eq {wpn,arm,head,acc1,acc2,chead}`, `store [{id,q}]` (storage, max 100) |
| money | `zeny`, `bank` |
| quests | `q {step,k}` (original tutorial chain), `qs { a: {questId:{s,k,f[]}}, d: {questId: 1 / day}, t: tracked, fl: {flag: value} }` |
| social | `guild` (guild **name**), `kills`, `bkills` |
| settings | `hot [6 skill ids]`, `auto {…}` (AUTO settings) |

### Guild (`db.guilds[name]`)

`{ name, master: <char name>, members: [<char name>…], created, lv: {<char name>: lv}, notice }`

## 2. ID relationships

```
account login ──1:1──> character (embedded)
character.name <──── guild.members[] / guild.master / guild.lv{}   (by NAME, both directions)
character.guild ───> guild name
character items ───> numeric item ids in content/items.js
character quests ──> quest ids in content/quests.js
party / trade / invites ─ session only (player.id = connection number), never saved
```

There is no numeric account or character id; renaming an account (guest → bind) re-keys the whole object.

## 3. Who reads / writes `db` directly

| Place | Access |
|---|---|
| `server.js` `loadDb` / `saveDb` / `setInterval(saveDb)` / `shutdown` / `uncaughtException` | whole file |
| `issueToken`, `tokenOk`, `revoke` | `account.tokens` |
| `register`, `guest`, `glogin`, `login`, `tlogin`, `bind` | create / read accounts, `account.char = newChar()` |
| `nameTaken`, `guestName` | scan every account's char name |
| `enterWorld` / `logout` / `syncChars` | `account.char = player.c` |
| `me()` | `account.guest` |
| everything that changes a character | sets the global `dirty = true` (≈40 places) |
| `engine/social.js` `rankings` | scans every account's char |
| `engine/social.js` guilds | `db.guilds` + an **offline** character's `guild` field when kicked |
| `engine/social.js` trade | swaps `inv`/`zeny` of two online characters, then `setDirty()` |

## 4. Race-condition risks

1. **Save is periodic, not per operation.** A crash loses up to 15 s of everyone's progress. Trades are swapped in
   memory and saved later; because the whole file is written atomically both sides roll back together (no item
   duplication), but a completed trade can be "undone" by a crash.
2. **Single global `dirty` flag** — any change rewrites every account; the cost grows with the player count and the
   write is synchronous (blocks the game loop).
3. **Two connections, same account**: `enterWorld` kicks the old session first; `logout` of the old socket writes
   `account.char = old char` — safe today only because both point to the same object.
4. **Async password hashing** (`register`, `bind`) re-checks the id/name after the hash; correct, keep the pattern.
5. **Guild kick of an offline member** edits the stored char by name; a rename/delete would leave a dangling name.

## 5. Data-corruption risks

1. A partially written or hand-edited `db.json` stops the server (falls back to `.bak`, exits if both are bad).
2. Name uniqueness is only a code scan — no constraint; a race between two registrations is handled by a re-check.
3. Guild ↔ character are linked by names in two places (can drift).
4. Old saves miss fields — handled by `fixChar()` on login (must stay).
5. The whole database is one object: one bad write path can damage every account.

## 6. Target: SQLite (`data/elyndra.db`)

Library: **`node:sqlite`** (built into Node ≥ 22.5; VPS runs Node 24.21). No native module to compile on the
Windows VPS, synchronous API that fits the current single-process design, real transactions, WAL.

Settings: `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`,
`PRAGMA quick_check` on start-up (refuses to start on a damaged file).

### Tables

| Table | Key columns |
|---|---|
| `meta` | schema version, migration source |
| `accounts` | `id`, `login` UNIQUE, `pw_alg` (`bcrypt`/`scrypt`), `pw_salt`, `pw_hash`, `guest`, `google`, `role` (`PLAYER`/`GM`/`ADMIN`, CHECK), `created_at`, `last_login_at` |
| `sessions` | `account_id`, `token_hash` UNIQUE, `expires_at` |
| `characters` | `id`, `account_id` FK, `slot` (UNIQUE per account), `name`, `name_key` UNIQUE (lower-case; NULL when deleted), `cls`, `lv`, `exp`, `jlv`, `jexp`, `zeny`, `bank`, `pts`, `hp`, `sp`, `map`, `x`, `y`, `dir`, `save_*`, `portrait_id`, `look` (json), `hot` (json), `guild`, `kills`, `bkills`, `created_at`, `deleted_at`, `extra` (json: fields not in a column, kept so nothing is ever dropped) |
| `character_stats` | `char_id` PK, str/agi/vit/int/dex/luk |
| `inventory_items` | `char_id`, `container` (`inv`/`store`), `pos`, `item_id`, `qty` |
| `equipment` | `char_id`, `slot`, `item_id` |
| `skills` | `char_id`, `skill_id`, `lv` (second-class learned skills) |
| `quests` | `char_id` PK, legacy `step`/`k`, `tracked`, `flags` (json) |
| `quest_progress` | `char_id`, `quest_id`, `state` (`active`/`done`), `stage`, `k`, `f` (json), `done_value` |
| `auto_settings` | `char_id` PK, `cfg` (json — validated by `sanitizeAuto`) |
| `guilds`, `guild_members` | guild by name, members by character name (same model as today) |
| `friendships`, `blocks` | prepared (Phase 6) |
| `mail`, `mail_attachments` | prepared + service (Phase 7) |
| `market_listings` | schema only (Phase 8, M6) |
| `bans`, `mutes` | Phase 3 |
| `gm_audit_log` | append-only (triggers refuse UPDATE / DELETE) |

Not over-normalised on purpose: AUTO settings, quest flags and look stay JSON columns (validated in code);
everything that is counted, traded or looked up (items, equipment, money, skills, quests, names) has columns.

### Runtime model (kept simple)

The game keeps characters in memory exactly as today (`player.c`), so combat / quest / inventory code does not
change. Persistence changes:

* `store.saveChars([...])` writes the given characters (all child rows) **in one transaction**.
* Periodic save (15 s) writes only characters that changed / are online — not the whole database.
* **Trade** commits both characters immediately in one transaction; mail claim / GM grants do the same.
* Accounts, sessions, bans, mutes, audit log, mail are written immediately (small rows).

## 7. Migration (`scripts/migrate-db-json-to-sqlite.js`, also run automatically on first start)

1. Copy `db.json` to `data/backups/db-json-<timestamp>.json`.
2. Read + validate every account / character (same rules as `fixChar`, nothing dropped: unknown fields → `extra`).
3. Create `elyndra.db` (temp file first), import everything in one transaction.
4. Verify: account count, character count, per character: inventory, storage, equipment, skills, quests, zeny, bank,
   level — read back from SQLite and compared with the JSON values.
5. Write `data/backups/migration-report-<timestamp>.json`, rename the temp file to `elyndra.db`.
6. **Never deletes `db.json`.** A marker `db.json.migrated` is written; if `elyndra.db` later disappears while the
   marker exists, the server refuses to start instead of silently re-importing old data.

Existing accounts move to "1 account → N characters" with their character in slot 1. Existing scrypt password
hashes keep working and are upgraded to bcrypt on the next successful login.

## 8. Rollback

`elyndra.db` can be deleted / moved and the marker removed to re-import from `db.json` (the JSON is untouched).
Backups (`scripts/backup-database.js`, `/gm backup`, automatic daily) use `VACUUM INTO` — a consistent copy even
while the server is running.
