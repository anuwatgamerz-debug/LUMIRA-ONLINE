#!/usr/bin/env node
'use strict';
// node scripts/backup-database.js [path/to/elyndra.db] [keep]
// Consistent copy (VACUUM INTO) to data/backups/elyndra-YYYY-MM-DD-HHMM.db — safe while the server runs.
// Keeps the newest `keep` backups (default 20, env BACKUP_KEEP).
const path = require('path');
const createStore = require('../engine/store');
const root = path.join(__dirname, '..');
const dbp = path.resolve(process.argv[2] || process.env.DATABASE_PATH || path.join(root, 'data', 'elyndra.db'));
const keep = +(process.argv[3] || process.env.BACKUP_KEEP || 20);
try { const S = createStore(dbp); const f = S.backup(path.join(path.dirname(dbp), 'backups'), keep); S.db.close(); console.log('backup:', f); }
catch (e) { console.error('backup failed:', e.message); process.exit(1); }
