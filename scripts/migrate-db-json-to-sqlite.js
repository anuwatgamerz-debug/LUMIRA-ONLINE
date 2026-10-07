#!/usr/bin/env node
'use strict';
// node scripts/migrate-db-json-to-sqlite.js [path/to/db.json] [path/to/elyndra.db]
// Backs up db.json, imports it into SQLite, verifies counts / items / equipment / skills / quests / zeny, writes a
// report to data/backups/. Never deletes db.json. Stop the game server first (the server also does this by itself
// on its first start when elyndra.db does not exist yet).
const path = require('path');
const { migrate } = require('../engine/migrate');
const root = path.join(__dirname, '..');
const json = path.resolve(process.argv[2] || path.join(root, 'data', 'db.json'));
const dbp = path.resolve(process.argv[3] || process.env.DATABASE_PATH || path.join(path.dirname(json), 'elyndra.db'));
try {
  const r = migrate(json, dbp, { log: console.log });
  console.log(`OK  accounts ${r.before.accounts} -> ${r.after.accounts}, characters ${r.before.characters} -> ${r.after.characters}, items ${r.before.items} -> ${r.after.items}, zeny ${r.before.zeny} -> ${r.after.zeny}`);
  for (const w of r.warnings) console.log('  warning:', w);
  console.log('report:', r.reportFile);
} catch (e) { console.error('migration failed:', e.message); process.exit(1); }
