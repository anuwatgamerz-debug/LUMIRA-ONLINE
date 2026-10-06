'use strict';
// ============================================================ LUMIRA ONLINE — social systems (server authority)
// Rankings (level / monster kills / boss kills / wealth / quests), player info, party (in-session, max 6, shared EXP
// for members nearby), guilds (saved in db.guilds) and player-to-player trade (items + zeny, both sides lock then
// confirm; the server re-checks every item, the zeny and the bag space at the moment of the swap).
module.exports = function social(api) {
  const { players, send, sys, getDb, setDirty, ITEMS, addItem, countItem, takeItem, me, MAPS } = api;
  const byId = id => players.get(+id);
  const online = p => p && p.c && p.ws && p.ws.readyState === 1;
  const near = (a, b, r) => a.c.map === b.c.map && Math.max(Math.abs(a.c.x - b.c.x), Math.abs(a.c.y - b.c.y)) <= r;
  const GUILD_COST = 5000, GUILD_LV = 10, PARTY_MAX = 6, GUILD_MAX = 30, INVITE_MS = 30000;

  // ------------------------------------------------------------------ rankings
  const RANKS = {
    level: { th: 'เลเวลสูงสุด', v: c => c.lv * 1e9 + (c.exp || 0), show: c => `Lv ${c.lv}` },
    kills: { th: 'ฆ่ามอนสเตอร์สูงสุด', v: c => c.kills || 0, show: c => `${(c.kills || 0).toLocaleString()} ตัว` },
    boss: { th: 'ฆ่าบอสสูงสุด', v: c => c.bkills || 0, show: c => `${c.bkills || 0} บอส` },
    zeny: { th: 'ร่ำรวยที่สุด', v: c => (c.zeny || 0) + (c.bank || 0), show: c => `${((c.zeny || 0) + (c.bank || 0)).toLocaleString()} z` },
    quest: { th: 'ทำภารกิจมากที่สุด', v: c => Object.keys((c.qs && c.qs.d) || {}).length, show: c => `${Object.keys((c.qs && c.qs.d) || {}).length} ภารกิจ` },
  };
  let rankCache = null, rankT = 0;
  function rankings() {
    if (rankCache && Date.now() - rankT < 10000) return rankCache;
    const live = new Map(); for (const p of players.values()) if (p.c) live.set(p.acct, p.c);
    const chars = Object.entries(getDb().accounts).map(([u, a]) => live.get(u) || a.char).filter(c => c && c.name);
    rankCache = {}; rankT = Date.now();
    for (const [k, R] of Object.entries(RANKS)) rankCache[k] = { th: R.th, rows: chars.map(c => [c.name, R.v(c), R.show(c), c.lv, c.cls || 'adventurer', c.guild || '']).sort((a, b) => b[1] - a[1]) };
    return rankCache;
  }
  function rankFor(p, k) {
    const all = rankings(), R = all[k] || all.level, i = R.rows.findIndex(r => r[0] === p.c.name);
    return { t: 'rank', k: all[k] ? k : 'level', cats: Object.fromEntries(Object.entries(RANKS).map(([id, r]) => [id, r.th])), rows: R.rows.slice(0, 50).map(([n, , s, lv, cls, g]) => [n, s, lv, cls, g]), mine: i >= 0 ? [i + 1, R.rows[i][2]] : null, total: R.rows.length };
  }
  function onKill(p, boss) { p.c.kills = (p.c.kills || 0) + 1; if (boss) p.c.bkills = (p.c.bkills || 0) + 1; }

  // ------------------------------------------------------------------ party
  const parties = new Map(); let partySeq = 1;
  const partyOf = p => p.party && parties.get(p.party);
  function partyView(pt) { return { t: 'party', id: pt.id, leader: pt.leader, members: [...pt.members].map(byId).filter(Boolean).map(o => ({ id: o.id, name: o.c.name, lv: o.c.lv, cls: o.c.cls, hp: o.c.hp, maxhp: o.c.maxhp, map: o.c.map, mapName: (MAPS[o.c.map] || {}).name || o.c.map, x: Math.round(o.c.x), y: Math.round(o.c.y) })) }; }
  function partySync(pt) { const v = partyView(pt); for (const id of pt.members) { const o = byId(id); if (online(o)) send(o, v); } }
  function partyLeave(p, why) {
    const pt = partyOf(p); if (!pt) return; pt.members.delete(p.id); p.party = 0;
    send(p, { t: 'party', id: 0, members: [] });
    if (pt.members.size < 2) { for (const id of pt.members) { const o = byId(id); if (o) { o.party = 0; if (online(o)) { send(o, { t: 'party', id: 0, members: [] }); sys(o, 'ปาร์ตี้ถูกยุบ', '#9fe7ff'); } } } parties.delete(pt.id); return; }
    if (pt.leader === p.id) pt.leader = [...pt.members][0];
    for (const id of pt.members) { const o = byId(id); if (online(o)) sys(o, `${p.c.name} ${why || 'ออกจากปาร์ตี้'}`, '#9fe7ff'); }
    partySync(pt);
  }
  // EXP for a kill: a member's share is split with party members nearby (+10% per extra member)
  function shareExp(p, exp, mapId) {
    const pt = partyOf(p); if (!pt) return [[p, exp]];
    const here = [...pt.members].map(byId).filter(o => o && o.c && o.c.map === mapId && !o.dead && near(o, p, 15));
    if (here.length < 2) return [[p, exp]];
    const each = Math.max(1, Math.round(exp * (1 + 0.1 * (here.length - 1)) / here.length));
    return here.map(o => [o, each]);
  }
  let partyTick = 0;
  function tick() { if (++partyTick % 4) return; for (const pt of parties.values()) partySync(pt); } // HP / map of members (every ~2 s)

  // ------------------------------------------------------------------ guilds (persistent)
  const guilds = () => (getDb().guilds = getDb().guilds || {});
  const guildOf = c => c.guild && guilds()[c.guild];
  function guildView(c) {
    const g = guildOf(c); if (!g) return { t: 'guild', g: null };
    const on = new Map([...players.values()].filter(o => o.c).map(o => [o.c.name, o.c]));
    return { t: 'guild', g: { name: g.name, master: g.master, notice: g.notice || '', members: g.members.map(n => { const oc = on.get(n); return { name: n, online: !!oc, lv: oc ? oc.lv : (g.lv && g.lv[n]) || 0, cls: oc ? oc.cls : '' }; }) } };
  }
  function guildSync(name) { for (const o of players.values()) if (o.c && o.c.guild === name && online(o)) send(o, guildView(o.c)); }

  // ------------------------------------------------------------------ invites
  function invite(p, o, kind, extra) {
    if (!o || o === p || !online(o)) return sys(p, 'ไม่พบผู้เล่นคนนี้');
    o.invites = o.invites || {}; o.invites[kind] = { from: p.id, until: Date.now() + INVITE_MS, ...extra };
    send(o, { t: 'invite', kind, from: p.id, name: p.c.name, ...extra });
  }
  const takeInvite = (p, kind) => { const v = p.invites && p.invites[kind]; if (p.invites) delete p.invites[kind]; return v && v.until > Date.now() ? v : null; };

  // ------------------------------------------------------------------ trade
  const trades = new Map(); let tradeSeq = 1;
  const tradeOf = p => p.trade && trades.get(p.trade);
  function tradeView(T, p) {
    const o = byId(T.a === p.id ? T.b : T.a), mine = T.offer[p.id], theirs = T.offer[o ? o.id : 0] || { items: [], zeny: 0 };
    return { t: 'trade', id: T.id, with: o ? o.c.name : '?', mine, theirs, lock: { me: !!T.lock[p.id], them: !!T.lock[o && o.id] }, ok: { me: !!T.ok[p.id], them: !!T.ok[o && o.id] } };
  }
  function tradeSync(T) { for (const id of [T.a, T.b]) { const o = byId(id); if (online(o)) send(o, tradeView(T, o)); } }
  function tradeEnd(T, msg) { trades.delete(T.id); for (const id of [T.a, T.b]) { const o = byId(id); if (!o) continue; o.trade = 0; if (online(o)) { send(o, { t: 'trade', id: 0, msg }); if (msg) sys(o, msg, '#ffb36b'); } } }
  function tradeCommit(T) {
    const A = byId(T.a), B = byId(T.b); if (!A || !B || !A.c || !B.c) return tradeEnd(T, 'การแลกเปลี่ยนถูกยกเลิก');
    if (!near(A, B, 10)) return tradeEnd(T, 'อยู่ห่างกันเกินไป — ยกเลิกการแลกเปลี่ยน');
    const sim = (p) => ({ inv: p.c.inv.map(s => ({ ...s })), zeny: p.c.zeny });
    const sa = sim(A), sb = sim(B);
    for (const [from, to, P] of [[sa, sb, A], [sb, sa, B]]) {
      const off = T.offer[P.id];
      if (off.zeny > from.zeny) return tradeEnd(T, `${P.c.name} มี Zeny ไม่พอ — ยกเลิก`);
      for (const it of off.items) if (countItem({ inv: from.inv }, it.id) < it.q) return tradeEnd(T, `${P.c.name} ไม่มีของที่เสนอแล้ว — ยกเลิก`);
    }
    for (const [from, to, P] of [[sa, sb, A], [sb, sa, B]]) {
      const off = T.offer[P.id]; from.zeny -= off.zeny; to.zeny += off.zeny;
      for (const it of off.items) { takeItem({ inv: from.inv }, it.id, it.q); }
    }
    for (const [from, to, P] of [[sa, sb, A], [sb, sa, B]]) for (const it of T.offer[P.id].items) if (!addItem({ inv: to.inv }, it.id, it.q)) return tradeEnd(T, 'กระเป๋าเต็ม — ยกเลิกการแลกเปลี่ยน (ไม่มีของหาย)');
    A.c.inv = sa.inv; A.c.zeny = sa.zeny; B.c.inv = sb.inv; B.c.zeny = sb.zeny; setDirty();
    trades.delete(T.id); A.trade = B.trade = 0;
    for (const o of [A, B]) { send(o, { t: 'trade', id: 0, done: 1, msg: 'แลกเปลี่ยนสำเร็จ!' }); sys(o, 'แลกเปลี่ยนสำเร็จ!', '#8fe38f'); me(o); api.itemsChanged(o); }
  }

  // ------------------------------------------------------------------ messages
  function handle(p, m) {
    const c = p.c;
    switch (m.t) {
      case 'rank': send(p, rankFor(p, String(m.k || 'level'))); return true;
      case 'pinfo': { const o = byId(m.id); if (!o || !o.c) return true; send(p, { t: 'pinfo', id: o.id, name: o.c.name, lv: o.c.lv, cls: o.c.cls, guild: o.c.guild || '', party: !!(o.party && o.party === p.party), kills: o.c.kills || 0 }); return true; }
      case 'party': {
        const a = String(m.a || '');
        if (a === 'invite') {
          const o = byId(m.id); let pt = partyOf(p);
          if (o && o.party && o.party === p.party) return sys(p, 'อยู่ในปาร์ตี้เดียวกันแล้ว'), true;
          if (o && o.party) return sys(p, `${o.c.name} อยู่ในปาร์ตี้อื่นแล้ว`), true;
          if (pt && pt.leader !== p.id) return sys(p, 'เฉพาะหัวหน้าปาร์ตี้ที่ชวนได้'), true;
          if (pt && pt.members.size >= PARTY_MAX) return sys(p, `ปาร์ตี้เต็มแล้ว (${PARTY_MAX} คน)`), true;
          invite(p, o, 'party'); if (o) sys(p, `ส่งคำชวนเข้าปาร์ตี้ถึง ${o.c.name} แล้ว`, '#9fe7ff'); return true;
        }
        if (a === 'accept') {
          const v = takeInvite(p, 'party'), f = v && byId(v.from); if (!f || !f.c) return sys(p, 'คำชวนหมดอายุแล้ว'), true;
          if (p.party) partyLeave(p);
          let pt = partyOf(f); if (!pt) { pt = { id: partySeq++, leader: f.id, members: new Set([f.id]) }; parties.set(pt.id, pt); f.party = pt.id; }
          if (pt.members.size >= PARTY_MAX) return sys(p, 'ปาร์ตี้เต็มแล้ว'), true;
          pt.members.add(p.id); p.party = pt.id;
          for (const id of pt.members) { const o = byId(id); if (online(o)) sys(o, `${c.name} เข้าร่วมปาร์ตี้`, '#9fe7ff'); }
          partySync(pt); return true;
        }
        if (a === 'decline') { const v = takeInvite(p, 'party'), f = v && byId(v.from); if (online(f)) sys(f, `${c.name} ปฏิเสธคำชวนเข้าปาร์ตี้`); return true; }
        if (a === 'leave') { partyLeave(p); return true; }
        if (a === 'kick') { const pt = partyOf(p), o = byId(m.id); if (pt && pt.leader === p.id && o && pt.members.has(o.id) && o !== p) { partyLeave(o, 'ถูกเชิญออกจากปาร์ตี้'); sys(o, 'คุณถูกเชิญออกจากปาร์ตี้'); } return true; }
        if (a === 'view') { const pt = partyOf(p); send(p, pt ? partyView(pt) : { t: 'party', id: 0, members: [] }); return true; }
        return true;
      }
      case 'guild': {
        const a = String(m.a || ''), G = guilds();
        if (a === 'view') { send(p, guildView(c)); return true; }
        if (a === 'create') {
          const name = String(m.name || '').trim();
          if (guildOf(c)) return sys(p, 'คุณอยู่ในกิลด์แล้ว'), true;
          if (!/^[A-Za-z0-9ก-๙ _]{2,16}$/.test(name)) return sys(p, 'ชื่อกิลด์ 2-16 ตัวอักษร (ไทย/อังกฤษ/ตัวเลข)'), true;
          if (Object.keys(G).some(k => k.toLowerCase() === name.toLowerCase())) return sys(p, 'ชื่อกิลด์นี้มีแล้ว'), true;
          if (c.lv < GUILD_LV) return sys(p, `ต้องการ Lv ${GUILD_LV} ขึ้นไปเพื่อสร้างกิลด์`), true;
          if (c.zeny < GUILD_COST) return sys(p, `ต้องใช้ ${GUILD_COST.toLocaleString()} Zeny เพื่อสร้างกิลด์`), true;
          c.zeny -= GUILD_COST; G[name] = { name, master: c.name, members: [c.name], created: Date.now(), lv: { [c.name]: c.lv } }; c.guild = name; setDirty();
          sys(p, `สร้างกิลด์ "${name}" สำเร็จ!`, '#ffd34d'); me(p); guildSync(name); return true;
        }
        if (a === 'invite') {
          const g = guildOf(c), o = byId(m.id); if (!g) return sys(p, 'คุณยังไม่มีกิลด์ — สร้างกิลด์ก่อน'), true;
          if (g.master !== c.name) return sys(p, 'เฉพาะหัวหน้ากิลด์ที่ชวนได้'), true;
          if (o && o.c && o.c.guild) return sys(p, `${o.c.name} อยู่ในกิลด์ "${o.c.guild}" แล้ว`), true;
          if (g.members.length >= GUILD_MAX) return sys(p, 'กิลด์เต็มแล้ว'), true;
          invite(p, o, 'guild', { guild: g.name }); if (o) sys(p, `ส่งคำชวนเข้ากิลด์ถึง ${o.c.name} แล้ว`, '#9fe7ff'); return true;
        }
        if (a === 'accept') {
          const v = takeInvite(p, 'guild'), g = v && G[v.guild]; if (!g) return sys(p, 'คำชวนหมดอายุแล้ว'), true;
          if (guildOf(c)) return sys(p, 'คุณอยู่ในกิลด์แล้ว'), true;
          g.members.push(c.name); (g.lv = g.lv || {})[c.name] = c.lv; c.guild = g.name; setDirty();
          for (const o of players.values()) if (o.c && o.c.guild === g.name) sys(o, `${c.name} เข้าร่วมกิลด์`, '#ffd34d');
          guildSync(g.name); me(p); return true;
        }
        if (a === 'decline') { const v = takeInvite(p, 'guild'), f = v && byId(v.from); if (online(f)) sys(f, `${c.name} ปฏิเสธคำชวนเข้ากิลด์`); return true; }
        if (a === 'leave' || a === 'kick') {
          const g = guildOf(c); if (!g) return true;
          const who = a === 'kick' ? String(m.name || '') : c.name;
          if (a === 'kick' && (g.master !== c.name || who === c.name || !g.members.includes(who))) return true;
          g.members = g.members.filter(n => n !== who);
          const wc = [...players.values()].find(o => o.c && o.c.name === who); const acc = Object.values(getDb().accounts).find(x => x.char && x.char.name === who);
          if (wc) wc.c.guild = ''; if (acc && acc.char) acc.char.guild = '';
          if (!g.members.length) delete G[g.name]; else if (g.master === who) g.master = g.members[0];
          setDirty(); if (wc && online(wc)) { send(wc, { t: 'guild', g: null }); sys(wc, a === 'kick' ? `คุณถูกเชิญออกจากกิลด์ "${g.name}"` : `ออกจากกิลด์ "${g.name}" แล้ว`); me(wc); }
          guildSync(g.name); return true;
        }
        return true;
      }
      case 'trade': {
        const a = String(m.a || '');
        if (a === 'req') {
          const o = byId(m.id); if (!o || !o.c || o === p) return true;
          if (p.trade || o.trade) return sys(p, 'มีการแลกเปลี่ยนค้างอยู่'), true;
          if (!near(p, o, 8)) return sys(p, 'ต้องอยู่ใกล้กัน (ไม่เกิน 8 ช่อง) จึงจะแลกเปลี่ยนได้'), true;
          invite(p, o, 'trade'); sys(p, `ส่งคำขอแลกเปลี่ยนถึง ${o.c.name} แล้ว`, '#9fe7ff'); return true;
        }
        if (a === 'accept') {
          const v = takeInvite(p, 'trade'), f = v && byId(v.from); if (!f || !f.c) return sys(p, 'คำขอหมดอายุแล้ว'), true;
          if (p.trade || f.trade) return sys(p, 'มีการแลกเปลี่ยนค้างอยู่'), true;
          if (!near(p, f, 8)) return sys(p, 'อยู่ห่างกันเกินไป'), true;
          const T = { id: tradeSeq++, a: f.id, b: p.id, offer: { [f.id]: { items: [], zeny: 0 }, [p.id]: { items: [], zeny: 0 } }, lock: {}, ok: {} };
          trades.set(T.id, T); f.trade = p.trade = T.id; tradeSync(T); return true;
        }
        if (a === 'decline') { const v = takeInvite(p, 'trade'), f = v && byId(v.from); if (online(f)) sys(f, `${c.name} ปฏิเสธการแลกเปลี่ยน`); return true; }
        const T = tradeOf(p); if (!T) return true;
        if (a === 'cancel') { tradeEnd(T, `${c.name} ยกเลิกการแลกเปลี่ยน`); return true; }
        if (a === 'offer') {
          if (T.lock[p.id]) return true;
          const items = [], seen = {};
          for (const it of (Array.isArray(m.items) ? m.items : []).slice(0, 10)) {
            const id = +it.id, q = Math.max(1, Math.min(9999, it.q | 0)); const I = ITEMS[id];
            if (!I || I.ty === 'quest' || seen[id]) continue; if (countItem(c, id) < q) continue; seen[id] = 1; items.push({ id, q });
          }
          T.offer[p.id] = { items, zeny: Math.max(0, Math.min(c.zeny, m.zeny | 0)) }; T.lock = {}; T.ok = {}; tradeSync(T); return true;
        }
        if (a === 'lock') { T.lock[p.id] = true; T.ok = {}; tradeSync(T); return true; }
        if (a === 'confirm') { if (!T.lock[T.a] || !T.lock[T.b]) return sys(p, 'ทั้งสองฝ่ายต้องกดล็อกก่อน'), true; T.ok[p.id] = true; if (T.ok[T.a] && T.ok[T.b]) tradeCommit(T); else tradeSync(T); return true; }
        return true;
      }
      case 'chat': {
        if (m.ch !== 'party' && m.ch !== 'guild') return false;
        const msg = String(m.m || '').slice(0, 120).trim(); if (!msg) return true;
        if (Date.now() - (p.lastChat || 0) < 700) return sys(p, 'พิมพ์เร็วเกินไป รอสักครู่แล้วส่งใหม่', '#ff8b8b'), true;
        p.lastChat = Date.now();
        const pkt = { t: 'chat', ch: m.ch, id: p.id, from: c.name, m: msg };
        if (m.ch === 'party') { const pt = partyOf(p); if (!pt) return sys(p, 'คุณยังไม่มีปาร์ตี้'), true; for (const id of pt.members) { const o = byId(id); if (online(o)) send(o, pkt); } }
        else { if (!c.guild) return sys(p, 'คุณยังไม่มีกิลด์'), true; for (const o of players.values()) if (o.c && o.c.guild === c.guild && online(o)) send(o, pkt); }
        return true;
      }
    }
    return false;
  }
  // logout / map change: leave the party, cancel a trade
  function onLeave(p) { const T = tradeOf(p); if (T) tradeEnd(T, `${p.c ? p.c.name : 'ผู้เล่น'} ออกจากเกม — ยกเลิกการแลกเปลี่ยน`); if (p.party) partyLeave(p, 'ออฟไลน์'); }
  function onWarp(p) { const T = tradeOf(p); if (T) tradeEnd(T, 'มีผู้เล่นย้ายแผนที่ — ยกเลิกการแลกเปลี่ยน'); }
  function onLogin(p) { if (p.c.guild && !guilds()[p.c.guild]) p.c.guild = ''; const g = guildOf(p.c); if (g) { (g.lv = g.lv || {})[p.c.name] = p.c.lv; send(p, guildView(p.c)); } }
  return { handle, onKill, shareExp, tick, onLeave, onWarp, onLogin, rankings, RANKS };
};
