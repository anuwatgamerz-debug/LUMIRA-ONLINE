'use strict';
// ============================================================ ELYNDRA ONLINE — social UI
// Tap another player: info · whisper · trade · party invite · guild invite. Party / guild windows, invites,
// the trade window (offer items + zeny, lock, confirm) and the ranking board. Every action is checked by the server.
let PARTY = { id: 0, members: [], leader: 0 }, GUILD = null, TRADE = null, RANK = null, PINFO = {};
const SOC_CLS = id => (CLSDEF[id] && CLSDEF[id].th) || 'นักผจญภัย';

function onSocial(m) {
  if (m.t === 'party') { PARTY = { id: m.id || 0, members: m.members || [], leader: m.leader || 0 }; if ($('wParty').style.display === 'block') renderParty(); }
  else if (m.t === 'guild') { GUILD = m.g; if ($('wGuild').style.display === 'block') renderGuild(); }
  else if (m.t === 'rank') { RANK = m; renderRank(); }
  else if (m.t === 'pinfo') { PINFO[m.id] = m; if ($('pmenu').dataset.id == m.id) fillPlayerMenu(m.id); }
  else if (m.t === 'invite') showInvite(m);
  else if (m.t === 'trade') { if (!m.id) { TRADE = null; $('wTrade').style.display = 'none'; if (m.msg) toast(m.msg); return; } const first = !TRADE, draft = TRADE && TRADE.draft; TRADE = m; TRADE.draft = draft || { items: [], zeny: 0 }; if (first) closeWins(); renderTrade(); $('wTrade').style.display = 'block'; }
}

// ---- tap a player: small menu next to them
function openPlayerMenu(id) {
  const e = ents.get(id); if (!e || e.kind !== 'p') return;
  const box = $('pmenu'); box.dataset.id = id; fillPlayerMenu(id); box.style.display = 'block';
  send({ t: 'pinfo', id });
}
function fillPlayerMenu(id) {
  const e = ents.get(+id) || {}, info = PINFO[id] || {}, inParty = PARTY.id && e.party === PARTY.id;
  const box = $('pmenu');
  box.innerHTML = `<div class="pmh"><b>${esc(e.name || info.name || '')}</b><small>Lv ${e.lv || info.lv || '?'} · ${esc(SOC_CLS(e.cls || info.cls))}${(e.guild || info.guild) ? ` · &lt;${esc(e.guild || info.guild)}&gt;` : ''}</small></div>
    <div class="pmb"><button data-a="info">👤 ดูข้อมูล</button><button data-a="whisper">💬 กระซิบ</button><button data-a="trade">⇄ แลกเปลี่ยน / ซื้อขาย</button>
    <button data-a="party" ${inParty ? 'disabled' : ''}>⚑ ${inParty ? 'อยู่ในปาร์ตี้แล้ว' : 'ชวนเข้าปาร์ตี้'}</button><button data-a="guild" ${(e.guild || info.guild) ? 'disabled' : ''}>🛡 ชวนเข้ากิลด์</button><button data-a="x" class="ghost">ปิด</button></div>`;
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = b.dataset.a; box.style.display = 'none';
    if (a === 'whisper') { openChat(false); chTab = 'whisper'; $('chtabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.ch === 'whisper')); renderChatList(); $('wto').value = e.name || info.name || ''; $('ci').focus(); }
    else if (a === 'trade') send({ t: 'trade', a: 'req', id: +id });
    else if (a === 'party') send({ t: 'party', a: 'invite', id: +id });
    else if (a === 'guild') { if (!me.guild) { toast('สร้างกิลด์ก่อน (เมนู กิลด์)'); return; } send({ t: 'guild', a: 'invite', id: +id }); }
    else if (a === 'info') { const i = PINFO[id] || {}; loginInfoBox(`${e.name || i.name}`, `Lv ${e.lv || i.lv} · ${SOC_CLS(e.cls || i.cls)}${i.guild ? ' · กิลด์ ' + i.guild : ''}<br>ฆ่ามอนสเตอร์ ${(i.kills || 0).toLocaleString()} ตัว`); }
  });
}
function loginInfoBox(t, html) { $('sinfoT').textContent = t; $('sinfoB').innerHTML = html; $('sinfo').style.display = 'block'; }
$('sinfoX').onclick = () => { $('sinfo').style.display = 'none'; };

// ---- invites (party / guild / trade): small prompt with accept / decline, auto-dismiss after 30 s
const INV_TH = { party: n => `${n} ชวนคุณเข้าปาร์ตี้`, guild: (n, m) => `${n} ชวนคุณเข้ากิลด์ "${m.guild}"`, trade: n => `${n} ขอแลกเปลี่ยนของกับคุณ` };
let invT = 0;
function showInvite(m) {
  const b = $('invbox'); b.innerHTML = `<div>${esc(INV_TH[m.kind](m.name, m))}</div><div class="aqb"><button data-a="accept">ตกลง</button><button data-a="decline" class="ghost">ปฏิเสธ</button></div>`;
  b.querySelectorAll('button').forEach(x => x.onclick = () => { b.style.display = 'none'; send({ t: m.kind, a: x.dataset.a }); });
  b.style.display = 'block'; clearTimeout(invT); invT = setTimeout(() => { b.style.display = 'none'; }, 30000);
}

// ---- party window
function renderParty() {
  const B = $('partybody'); if (!B) return;
  if (!PARTY.id) { B.innerHTML = '<div class="note">ยังไม่มีปาร์ตี้ · แตะตัวละครผู้เล่นคนอื่นแล้วเลือก "ชวนเข้าปาร์ตี้" (สูงสุด 6 คน)<br>สมาชิกที่อยู่ใกล้กัน (แผนที่เดียวกัน ไม่เกิน 15 ช่อง) จะแบ่ง EXP กัน +10% ต่อสมาชิกเพิ่ม</div>'; return; }
  const lead = PARTY.leader === myId;
  B.innerHTML = PARTY.members.map(o => `<div class="li"><div class="grow"><b style="color:${o.id === PARTY.leader ? 'var(--gold)' : '#e8e2cc'}">${o.id === PARTY.leader ? '★ ' : ''}${esc(o.name)}</b> <small>Lv ${o.lv} · ${esc(SOC_CLS(o.cls))}</small>
    <div class="bar hp" style="height:1rem;margin-top:.2rem"><i style="width:${Math.max(0, Math.min(100, o.hp / o.maxhp * 100))}%"></i><b class="num" style="font-size:.75rem;line-height:1rem">${o.hp}/${o.maxhp}</b></div><small class="st">📍 ${esc(o.mapName)} (${o.x},${o.y})</small></div>
    ${lead && o.id !== myId ? `<button data-k="${o.id}" class="ghost">เชิญออก</button>` : ''}</div>`).join('') + '<button id="pLeave" class="ghost" style="margin-top:.6rem;width:100%">ออกจากปาร์ตี้</button><div class="note">แชทปาร์ตี้: เปิดหน้าต่างแชท → แท็บ ปาร์ตี้</div>';
  B.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => send({ t: 'party', a: 'kick', id: +b.dataset.k }));
  $('pLeave').onclick = () => send({ t: 'party', a: 'leave' });
}
// ---- guild window
function renderGuild() {
  const B = $('guildbody'); if (!B) return;
  if (!GUILD) {
    B.innerHTML = `<div class="note">คุณยังไม่มีกิลด์ · สร้างกิลด์ใหม่ (Lv 10 ขึ้นไป · ค่าสร้าง 5,000 Zeny) หรือให้หัวหน้ากิลด์แตะตัวคุณแล้วกด "ชวนเข้ากิลด์"</div>
      <div class="acrow"><input id="gname" maxlength="16" placeholder="ชื่อกิลด์ (2-16 ตัวอักษร)" style="flex:1"><button id="gcreate">สร้างกิลด์</button></div>`;
    $('gcreate').onclick = () => send({ t: 'guild', a: 'create', name: $('gname').value.trim() }); return;
  }
  const master = GUILD.master === (me && me.name);
  B.innerHTML = `<div class="acph" style="margin-bottom:.4rem">🛡 <b>${esc(GUILD.name)}</b> <small style="color:var(--dim)">หัวหน้า: ${esc(GUILD.master)} · ${GUILD.members.length} คน</small></div>`
    + GUILD.members.map(o => `<div class="li"><span style="color:${o.online ? '#7dff8a' : '#6b7090'}">●</span><div class="grow">${o.name === GUILD.master ? '★ ' : ''}${esc(o.name)} <small>${o.lv ? 'Lv ' + o.lv : ''}${o.cls ? ' · ' + esc(SOC_CLS(o.cls)) : ''}${o.online ? '' : ' · ออฟไลน์'}</small></div>${master && o.name !== GUILD.master ? `<button data-k="${esc(o.name)}" class="ghost">เชิญออก</button>` : ''}</div>`).join('')
    + '<button id="gLeave" class="ghost" style="margin-top:.6rem;width:100%">ออกจากกิลด์</button><div class="note">แชทกิลด์: หน้าต่างแชท → แท็บ กิลด์ · ชวนสมาชิก: แตะตัวละครผู้เล่นอื่น</div>';
  B.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => send({ t: 'guild', a: 'kick', name: b.dataset.k }));
  $('gLeave').onclick = () => { if (confirm('ออกจากกิลด์?')) send({ t: 'guild', a: 'leave' }); };
}
// ---- trade window: tap bag items to add them to your offer (+ zeny), lock, then both confirm
function renderTrade() {
  const T = TRADE; if (!T) return; const D = T.draft, B = $('tradebody');
  const row = (o, mine) => `<div class="trlist">${(o.items || []).map(it => `<div class="slot"><span class="ic" data-id="${it.id}"></span>${esc(ITEMS[it.id].n)}<span class="q num">${it.q}</span>${mine && !T.lock.me ? `<button class="trx" data-rm="${it.id}">✕</button>` : ''}</div>`).join('') || '<div class="note">ยังไม่มีของ</div>'}</div><div class="trz num">💰 ${(o.zeny || 0).toLocaleString()} Zeny</div>`;
  B.innerHTML = `<div class="trcols"><div class="trc ${T.lock.me ? 'lk' : ''}"><b>ของคุณ ${T.lock.me ? '🔒' : ''}${T.ok.me ? ' ✔' : ''}</b>${row(T.mine, true)}</div><div class="trc ${T.lock.them ? 'lk' : ''}"><b>${esc(T.with)} ${T.lock.them ? '🔒' : ''}${T.ok.them ? ' ✔' : ''}</b>${row(T.theirs, false)}</div></div>
    ${T.lock.me ? '' : `<div class="note">แตะของในกระเป๋าเพื่อเพิ่ม (แตะซ้ำ = +1) · ไอเทมเควสแลกไม่ได้</div><div class="trbag">${me.inv.filter(s => ITEMS[s.id] && ITEMS[s.id].ty !== 'quest').map(s => `<div class="slot" data-add="${s.id}"><span class="ic" data-id="${s.id}"></span>${esc(ITEMS[s.id].n)}${s.q > 1 ? `<span class="q num">${s.q}</span>` : ''}</div>`).join('')}</div>
    <div class="acrow">Zeny <input id="trzeny" type="number" min="0" max="${me.zeny}" value="${D.zeny || 0}" style="flex:1"><button id="troffer">อัปเดตข้อเสนอ</button></div>`}
    <div class="trbtn"><button id="trlock" ${T.lock.me ? 'disabled' : ''}>🔒 ล็อกข้อเสนอ</button><button id="trok" ${!(T.lock.me && T.lock.them) || T.ok.me ? 'disabled' : ''}>✔ ยืนยันแลก</button><button id="trcancel" class="ghost">ยกเลิก</button></div>
    <div class="note">ทั้งสองฝ่ายต้องล็อกก่อน แล้วกดยืนยันทั้งคู่ · เปลี่ยนข้อเสนอเมื่อไหร่ การล็อกจะถูกยกเลิก · เซิร์ฟเวอร์ตรวจของ/Zeny/ช่องกระเป๋าตอนแลกจริง</div>`;
  B.querySelectorAll('.ic').forEach(i => i.appendChild(iconCanvas(+i.dataset.id)));
  const push = () => send({ t: 'trade', a: 'offer', items: D.items, zeny: D.zeny || 0 });
  B.querySelectorAll('[data-add]').forEach(d => d.onclick = () => { const id = +d.dataset.add, have = me.inv.filter(s => s.id === id).reduce((a, s) => a + s.q, 0), cur = D.items.find(x => x.id === id); if (cur) cur.q = Math.min(have, cur.q + 1); else D.items.push({ id, q: 1 }); push(); });
  B.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { D.items = D.items.filter(x => x.id !== +b.dataset.rm); push(); });
  if ($('troffer')) $('troffer').onclick = () => { D.zeny = Math.max(0, Math.min(me.zeny, +$('trzeny').value || 0)); push(); };
  $('trlock').onclick = () => send({ t: 'trade', a: 'lock' }); $('trok').onclick = () => send({ t: 'trade', a: 'confirm' }); $('trcancel').onclick = () => send({ t: 'trade', a: 'cancel' });
}
// ---- ranking board
let rankK = 'level';
function openRank() { closeWins(); $('wRank').style.display = 'block'; $('rankbody').innerHTML = '<div class="note">กำลังโหลด...</div>'; send({ t: 'rank', k: rankK }); }
function renderRank() {
  const R = RANK; if (!R) return; rankK = R.k;
  $('ranktabs').innerHTML = Object.entries(R.cats).map(([k, th]) => `<button data-k="${k}" class="${k === R.k ? 'on' : ''}">${esc(th)}</button>`).join('');
  $('ranktabs').querySelectorAll('button').forEach(b => b.onclick = () => { rankK = b.dataset.k; send({ t: 'rank', k: rankK }); });
  const medal = i => ['🥇', '🥈', '🥉'][i] || `<span class="num">${i + 1}</span>`;
  $('rankbody').innerHTML = (R.mine ? `<div class="rkme">อันดับของคุณ: <b class="num">#${R.mine[0]}</b> จาก ${R.total} · ${esc(R.mine[1])}</div>` : '')
    + R.rows.map(([n, v, lv, cls, g], i) => `<div class="rk ${me && n === me.name ? 'me' : ''} ${i < 3 ? 'top' : ''}"><span class="rkn">${medal(i)}</span><div class="grow"><b>${esc(n)}</b> <small>Lv ${lv} · ${esc(SOC_CLS(cls))}${g ? ` · &lt;${esc(g)}&gt;` : ''}</small></div><span class="rkv num">${esc(v)}</span></div>`).join('')
    || '<div class="note">ยังไม่มีข้อมูล</div>';
}
document.addEventListener('pointerdown', e => { const b = $('pmenu'); if (b.style.display === 'block' && !b.contains(e.target)) b.style.display = 'none'; }, true);
