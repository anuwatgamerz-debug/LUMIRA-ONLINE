'use strict';
// ============================================================ ELYNDRA ONLINE — GM / ADMIN commands (server authority)
// Roles live in the database (accounts.role: PLAYER / GM / ADMIN); a client can never claim one. Commands arrive as chat
// "/gm <command> ..." or from the GM window (same path). Every command is checked against the caller's role and written
// to gm_audit_log (append-only, no client can delete it).
//   GM    : help who inspect teleport summon kick mute unmute ban unban announce
//   ADMIN : + item gold level quest mail backup role
const PERM = {
  help: 'GM', who: 'GM', inspect: 'GM', teleport: 'GM', summon: 'GM', kick: 'GM', mute: 'GM', unmute: 'GM', ban: 'GM', unban: 'GM', announce: 'GM',
  item: 'ADMIN', gold: 'ADMIN', level: 'ADMIN', quest: 'ADMIN', mail: 'ADMIN', backup: 'ADMIN', role: 'ADMIN',
};
const RANK = { PLAYER: 0, GM: 1, ADMIN: 2 };
const HELP = {
  who: '/gm who', inspect: '/gm inspect NAME', teleport: '/gm teleport MAP X Y', summon: '/gm summon NAME', kick: '/gm kick NAME [เหตุผล]',
  mute: '/gm mute NAME 30m|2h|7d|perm เหตุผล', unmute: '/gm unmute NAME', ban: '/gm ban NAME|@login 1d|perm เหตุผล', unban: '/gm unban NAME|@login',
  announce: '/gm announce ข้อความ', item: '/gm item NAME ITEM_ID QTY', gold: '/gm gold NAME AMOUNT', level: '/gm level NAME LEVEL',
  quest: '/gm quest NAME QUEST_ID [start|done|reset]', mail: '/gm mail NAME ITEM_ID QTY GOLD [หัวข้อ]', backup: '/gm backup', role: '/gm role @login PLAYER|GM|ADMIN',
};
// "30m" "2h" "7d" "perm" -> ms (null = permanent); undefined = not a duration
function dur(s) { s = String(s || '').toLowerCase(); if (/^(perm|permanent|forever|ถาวร)$/.test(s)) return null; const m = /^(\d{1,4})(m|h|d)$/.exec(s); return m ? +m[1] * { m: 60e3, h: 3600e3, d: 864e5 }[m[2]] : undefined; }

module.exports = function gm(api) {
  const { store, db, players, send, sys, bcastAll, MAPS, ITEMS, QUESTS, L } = api;
  const roleOf = p => (db.accounts[p.acct] || {}).role || 'PLAYER';
  const can = (p, cmd) => RANK[roleOf(p)] >= RANK[PERM[cmd] || 'ADMIN'];
  const online = name => [...players.values()].find(o => o.c && o.c.name.toLowerCase() === String(name).toLowerCase());
  // character by name (online or offline) -> { c, a (account), p (player if online) }
  function find(name) {
    name = String(name || '').toLowerCase();
    for (const a of Object.values(db.accounts)) for (const c of a.chars || []) if (c.name.toLowerCase() === name) { const p = [...players.values()].find(o => o.c === c); return { c, a, p }; }
    return null;
  }
  const accountOf = ref => { ref = String(ref || ''); if (ref.startsWith('@')) { const a = db.accounts[ref.slice(1).toLowerCase()]; return a ? { a } : null; } return find(ref); };
  const audit = (p, action, target, reason, detail, ok = true) => { try { store.audit({ gm: `${p.acct}/${p.c ? p.c.name : '-'}`, role: roleOf(p), action, target, reason, detail, ok }); } catch (e) { L.error('audit_failed', { err: e.message }); } L.log('gm_action', { gm: p.acct, action, target, reason, ok }); };
  const say = (p, t, col) => sys(p, '[GM] ' + t, col || '#9fe7ff');
  const until = ms => (ms == null ? null : Date.now() + ms);
  const when = t => (t ? new Date(t).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'ถาวร');
  function kickPlayer(o, why) { send(o, { t: 'err', code: 'kicked', m: why }); api.logout(o); try { o.ws.close(); } catch (e) { } }

  function run(p, line) {
    const parts = String(line || '').trim().split(/\s+/); parts.shift(); // "/gm"
    const cmd = (parts.shift() || 'help').toLowerCase(), A = parts;
    if (!RANK[roleOf(p)]) { L.warn('gm_denied', { u: p.acct, cmd }); sys(p, 'ไม่พบคำสั่งนี้', '#ffb36b'); return true; } // players: no GM command runs and nothing is posted to chat
    if (!PERM[cmd]) { say(p, `ไม่รู้จักคำสั่ง "${cmd}" — พิมพ์ /gm help`); return true; }
    if (!can(p, cmd)) { audit(p, cmd, A[0], 'no permission', null, false); say(p, `คำสั่ง ${cmd} ต้องเป็น ${PERM[cmd]}`, '#ff8b8b'); return true; }
    const need = (n) => { if (A.length < n) { say(p, 'รูปแบบ: ' + HELP[cmd], '#ffb36b'); return false; } return true; };
    switch (cmd) {
      case 'help': say(p, Object.entries(HELP).filter(([k]) => can(p, k)).map(([, h]) => h).join(' · ')); return true;
      case 'who': { const l = [...players.values()].filter(o => o.c).map(o => `${o.c.name} Lv${o.c.lv} @${o.c.map}`); audit(p, 'who'); say(p, `ออนไลน์ ${l.length}: ${l.join(', ')}`); return true; }
      case 'inspect': {
        if (!need(1)) return true; const r = find(A[0]); if (!r) { say(p, 'ไม่พบตัวละคร'); return true; }
        const { c, a } = r, ban = store.activeBan(a.id), mute = store.activeMute(a.id);
        audit(p, 'inspect', c.name);
        send(p, { t: 'gminfo', char: { id: c._id, name: c.name, lv: c.lv, cls: c.cls, jlv: c.jlv, map: c.map, x: Math.round(c.x), y: Math.round(c.y), zeny: c.zeny, bank: c.bank, inv: c.inv, store: c.store, eq: c.eq, guild: c.guild || '', online: !!r.p },
          account: { login: a.login, role: a.role, guest: !!a.guest, chars: a.chars.map(x => x.name), created: a.created, lastLogin: a.lastLogin }, ban, mute });
        say(p, `${c.name} Lv${c.lv} ${c.cls} @${c.map}(${Math.round(c.x)},${Math.round(c.y)}) · ${c.zeny}z · บัญชี ${a.login} (${a.role})${ban ? ' · แบน' : ''}${mute ? ' · มิวต์' : ''}${r.p ? ' · ออนไลน์' : ''}`);
        return true;
      }
      case 'teleport': {
        if (!need(3)) return true; const map = A[0], x = +A[1], y = +A[2];
        if (!MAPS[map] || !Number.isFinite(x) || !Number.isFinite(y) || !api.walkable(MAPS[map], Math.round(x), Math.round(y))) { say(p, 'แผนที่/ตำแหน่งไม่ถูกต้อง'); return true; }
        audit(p, 'teleport', `${map} ${x} ${y}`); api.warp(p, map, Math.round(x), Math.round(y)); return true;
      }
      case 'summon': {
        if (!need(1)) return true; const o = online(A[0]); if (!o) { say(p, 'ผู้เล่นไม่ได้ออนไลน์'); return true; }
        audit(p, 'summon', o.c.name, null, { map: p.c.map, x: Math.round(p.c.x), y: Math.round(p.c.y) }); api.warp(o, p.c.map, Math.round(p.c.x), Math.round(p.c.y)); sys(o, 'คุณถูก GM เรียกตัว', '#9fe7ff'); return true;
      }
      case 'kick': {
        if (!need(1)) return true; const o = online(A[0]); if (!o) { say(p, 'ผู้เล่นไม่ได้ออนไลน์'); return true; }
        const why = A.slice(1).join(' ') || 'ถูก GM เตะออกจากเกม'; audit(p, 'kick', o.c.name, why); kickPlayer(o, why); say(p, `เตะ ${A[0]} แล้ว`); return true;
      }
      case 'mute': case 'ban': {
        if (!need(2)) return true; const r = accountOf(A[0]); if (!r) { say(p, 'ไม่พบตัวละคร/บัญชี'); return true; }
        const ms = dur(A[1]); if (ms === undefined) { say(p, 'ระยะเวลา: 30m / 2h / 7d / perm'); return true; }
        const why = A.slice(2).join(' ').slice(0, 200) || (cmd === 'ban' ? 'ทำผิดกฎ' : 'แชทไม่เหมาะสม');
        if (r.a.role === 'ADMIN' && roleOf(p) !== 'ADMIN') { say(p, 'แบน/มิวต์ ADMIN ไม่ได้'); return true; }
        const exp = until(ms);
        if (cmd === 'ban') {
          store.addBan(r.a.id, why, p.acct, exp); store.clearSessions(r.a);
          for (const o of [...players.values()]) if (o.acct === r.a.login) kickPlayer(o, `บัญชีนี้ถูกระงับ: ${why}`);
        } else { store.addMute(r.a.id, why, p.acct, exp); for (const o of players.values()) if (o.acct === r.a.login) { o.mute = store.activeMute(r.a.id); sys(o, `คุณถูกห้ามแชท (${when(exp)}): ${why}`, '#ff8b8b'); } }
        audit(p, cmd, r.a.login + (r.c ? '/' + r.c.name : ''), why, { until: exp }); say(p, `${cmd === 'ban' ? 'แบน' : 'มิวต์'} ${A[0]} ถึง ${when(exp)}`); return true;
      }
      case 'unmute': case 'unban': {
        if (!need(1)) return true; const r = accountOf(A[0]); if (!r) { say(p, 'ไม่พบตัวละคร/บัญชี'); return true; }
        const n = cmd === 'unban' ? store.liftBan(r.a.id, p.acct) : store.liftMute(r.a.id, p.acct);
        if (cmd === 'unmute') for (const o of players.values()) if (o.acct === r.a.login) { o.mute = null; sys(o, 'คุณแชทได้แล้ว', '#8fe38f'); }
        audit(p, cmd, r.a.login, null, { lifted: n }); say(p, n ? `ยกเลิกแล้ว (${A[0]})` : 'ไม่มีรายการที่ยังมีผล'); return true;
      }
      case 'announce': { const msg = A.join(' ').slice(0, 200); if (!msg) return need(1), true; audit(p, 'announce', null, null, { msg }); bcastAll({ t: 'sys', m: `📢 ประกาศ: ${msg}`, col: '#ffd34d' }); return true; }
      case 'item': case 'gold': case 'level': {
        if (!need(2)) return true; const r = find(A[0]); if (!r) { say(p, 'ไม่พบตัวละคร'); return true; }
        const { c } = r, before = { zeny: c.zeny, lv: c.lv, inv: c.inv.map(s => ({ ...s })) };
        if (cmd === 'item') {
          const id = +A[1], q = Math.max(1, Math.min(9999, +A[2] || 1)); if (!ITEMS[id]) { say(p, 'ไม่พบไอเทม'); return true; }
          if (!api.addItem(c, id, q)) { say(p, 'กระเป๋าของผู้เล่นเต็ม — ใช้ /gm mail แทน'); return true; }
        } else if (cmd === 'gold') { const v = Math.trunc(+A[1]); if (!Number.isFinite(v) || !v) { say(p, 'จำนวนไม่ถูกต้อง'); return true; } c.zeny = Math.max(0, Math.min(2e9, c.zeny + v)); }
        else { const lv = Math.trunc(+A[1]); if (!(lv >= 1 && lv <= api.MAX_LV)) { say(p, `เลเวล 1-${api.MAX_LV}`); return true; } c.lv = lv; c.exp = 0; api.derive(c); }
        try { api.commitChars([c]); } catch (e) { c.zeny = before.zeny; c.lv = before.lv; c.inv = before.inv; say(p, 'บันทึกไม่สำเร็จ'); audit(p, cmd, c.name, null, { args: A.slice(1), err: e.message }, false); return true; }
        audit(p, cmd, c.name, A.slice(3).join(' ') || null, { args: A.slice(1, 3) }); if (r.p) { api.me(r.p); sys(r.p, 'GM ปรับข้อมูลตัวละครของคุณ', '#9fe7ff'); } say(p, `${cmd} → ${c.name} สำเร็จ`); return true;
      }
      case 'quest': {
        if (!need(2)) return true; const r = find(A[0]), qid = A[1], how = (A[2] || 'start').toLowerCase(); if (!r) { say(p, 'ไม่พบตัวละคร'); return true; }
        if (!QUESTS[qid]) { say(p, 'ไม่พบเควส'); return true; }
        const S = api.Q.st(r.c);
        if (how === 'reset') { delete S.a[qid]; delete S.d[qid]; } else if (how === 'done') { delete S.a[qid]; S.d[qid] = 1; } else { delete S.d[qid]; S.a[qid] = { s: 0, k: 0, f: [] }; }
        api.commitChars([r.c]); audit(p, 'quest', r.c.name, null, { quest: qid, how }); if (r.p) api.me(r.p); say(p, `เควส ${qid} (${how}) → ${r.c.name}`); return true;
      }
      case 'mail': {
        if (!need(3)) return true; const r = find(A[0]); if (!r) { say(p, 'ไม่พบตัวละคร'); return true; }
        const item = +A[1] || 0, qty = Math.max(0, +A[2] | 0), gold = Math.max(0, +A[3] | 0);
        if (item && !ITEMS[item]) { say(p, 'ไม่พบไอเทม'); return true; }
        const id = api.mail.send({ kind: 'gm', fromName: 'ทีมงาน ELYNDRA', to: r.c._id, subject: A.slice(4).join(' ') || 'ของชดเชยจากทีมงาน', body: 'ขอบคุณที่ร่วมเล่น ELYNDRA ONLINE', atts: [{ item: item || null, qty: item ? Math.max(1, qty) : 0, gold }] });
        audit(p, 'mail', r.c.name, null, { mail: id, item, qty, gold }); if (r.p) sys(r.p, '📬 มีจดหมายใหม่จากทีมงาน', '#ffd34d'); say(p, `ส่งจดหมาย #${id} ถึง ${r.c.name}`); return true;
      }
      case 'backup': { const f = api.backupNow('gm'); audit(p, 'backup', null, null, { file: f && require('path').basename(f) }, !!f); say(p, f ? 'สำรองฐานข้อมูลแล้ว' : 'สำรองไม่สำเร็จ'); return true; }
      case 'role': {
        if (!need(2)) return true; const r = accountOf(A[0].startsWith('@') ? A[0] : '@' + A[0]), role = String(A[1]).toUpperCase();
        if (!r || !RANK.hasOwnProperty(role)) { say(p, 'รูปแบบ: ' + HELP.role); return true; }
        if (r.a.login === p.acct) { say(p, 'เปลี่ยน role ของตัวเองไม่ได้'); return true; }
        store.setRole(r.a, role); audit(p, 'role', r.a.login, null, { role }); for (const o of players.values()) if (o.acct === r.a.login && o.c) api.me(o); say(p, `${r.a.login} → ${role}`); return true;
      }
    }
    return true;
  }
  // read-only views for the GM window (GM+): mutations go through run() so they are permission-checked + audited
  function view(p, m) {
    if (!RANK[roleOf(p)]) return false;
    const a = String(m.a || '');
    if (a === 'overview') { const c = store.counts(); return send(p, { t: 'admin', a, data: { online: players.size, ...c, uptime: Math.round(process.uptime()), mem: Math.round(process.memoryUsage().rss / 1048576), role: roleOf(p) } }), true; }
    if (a === 'players') return send(p, { t: 'admin', a, data: [...players.values()].filter(o => o.c).map(o => ({ name: o.c.name, lv: o.c.lv, cls: o.c.cls, map: o.c.map, login: o.acct, muted: !!o.mute })) }), true;
    if (a === 'accounts') {
      const q = String(m.q || '').toLowerCase().slice(0, 40);
      const rows = Object.values(db.accounts).filter(x => !q || x.login.includes(q) || (x.chars || []).some(c => c.name.toLowerCase().includes(q))).slice(0, 50)
        .map(x => ({ login: x.login, role: x.role, guest: !!x.guest, chars: x.chars.map(c => `${c.name} Lv${c.lv}`), banned: !!store.activeBan(x.id), muted: !!store.activeMute(x.id) }));
      audit(p, 'admin_accounts', q || '*'); return send(p, { t: 'admin', a, data: rows }), true;
    }
    if (a === 'bans') return send(p, { t: 'admin', a, data: { bans: store.listBans(50), mutes: store.listMutes(50) } }), true;
    if (a === 'audit') return send(p, { t: 'admin', a, data: store.auditList(100) }), true;
    return true;
  }
  return { run, view, roleOf, can, PERM, dur };
};
