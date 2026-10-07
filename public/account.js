'use strict';
// ============================================================ ELYNDRA ONLINE — character select, GM window, mailbox
// Login -> Character Select -> Enter World. The server decides which characters belong to the signed-in account;
// the client only sends the id of a card it was given. Create uses the same create form (moved into this screen),
// delete needs two steps + the exact name typed again (checked again by the server).
let CHARS = { list: [], max: 3 }, chIdx = 0, chHome = null;
document.body.appendChild($('chDelBox')); // the confirm box must not live inside the (hidden) HUD
const chLogin = () => $('login');
function showCharSelect(m) {
  CHARS = { list: m.list || [], max: m.max || 3 };
  if (me) leaveWorldUI(); // "change character" from inside the game
  const L = chLogin(); L.style.display = ''; L.classList.remove('leaving');
  $('lbox').hidden = true; $('chsel').hidden = false; setBusy(false);
  $('chErr').textContent = ''; $('chsub').textContent = `1 บัญชีสร้างได้สูงสุด ${CHARS.max} ตัวละคร · ${CHARS.list.length}/${CHARS.max}`;
  if (m.sel) { const i = CHARS.list.findIndex(c => c.id === m.sel); if (i >= 0) chIdx = i; }
  chIdx = Math.max(0, Math.min(chIdx, Math.max(0, CHARS.list.length - 1)));
  closeCreate(); renderChars();
  if (!CHARS.list.length) openCreate(); // a new account without characters: straight to create
  if (typeof loginLayout === 'function') loginLayout();
}
function renderChars() {
  const box = $('chcards'), slots = [];
  for (let i = 0; i < CHARS.max; i++) slots.push(CHARS.list[i] || null);
  const sel = Math.min(chIdx, slots.length - 1);
  box.innerHTML = slots.map((c, i) => c
    ? `<button type="button" class="chcard${i === sel ? ' on' : ''}" data-i="${i}"><span class="cp"><img alt=""></span><b>${esc(c.name)}</b><small>${esc(c.clsTh || c.cls)} · Lv ${c.lv} · Job ${c.jlv}<br>📍 ${esc(c.mapName || c.map)}</small></button>`
    : `<button type="button" class="chcard empty${i === sel ? ' on' : ''}" data-i="${i}" data-empty="1"><span class="plus">+</span><small>ช่องว่าง<br>สร้างตัวละคร</small></button>`).join('');
  box.querySelectorAll('.chcard').forEach(b => {
    const c = slots[+b.dataset.i]; if (c && window.PORTRAIT) PORTRAIT.setImg(b.querySelector('img'), c.portraitId, 'hud');
    b.onclick = () => { if (b.dataset.empty) { chIdx = +b.dataset.i; return openCreate(); } if (chIdx === +b.dataset.i) return enterChar(); chIdx = +b.dataset.i; renderChars(); };
  });
  $('chslots').innerHTML = slots.map((c, i) => `<button type="button" data-i="${i}" class="${i === sel ? 'on' : ''}">${c ? esc(c.name) : 'ว่าง'}</button>`).join('');
  $('chslots').querySelectorAll('button').forEach(b => b.onclick = () => { chIdx = +b.dataset.i; if (!slots[chIdx]) openCreate(); else renderChars(); });
  const cur = slots[sel];
  $('chEnter').disabled = !cur; $('chDel').disabled = !cur; $('chNew').disabled = CHARS.list.length >= CHARS.max;
}
function enterChar() { const c = CHARS.list[chIdx]; if (!c || !ws) return; $('chEnter').disabled = true; $('chEnter').innerHTML = '<span class="spin"></span>กำลังเข้าสู่โลก Elyndra...'; ws.send(JSON.stringify({ t: 'enter', id: c.id })); }
const chStep = d => { if (!CHARS.list.length) return; chIdx = (chIdx + d + CHARS.max) % CHARS.max; renderChars(); };
$('chPrev').onclick = () => chStep(-1); $('chNext').onclick = () => chStep(1);
$('chEnter').onclick = enterChar;
// swipe between characters on phones
{ let x0 = null; const v = $('chview'); v.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true }); v.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) chStep(dx < 0 ? 1 : -1); }); }
// ---- create: the existing create form (name, portrait gallery, body / hair) is moved into this screen
function openCreate() {
  if (CHARS.list.length >= CHARS.max) { $('chErr').textContent = `สร้างได้สูงสุด ${CHARS.max} ตัวละคร`; return; }
  const rb = $('regbox'); if (!chHome) chHome = rb.parentNode;
  $('chCreateSlot').appendChild(rb); rb.style.display = 'block';
  $('chmain').hidden = true; $('chCreate').hidden = false; $('chErr').textContent = ''; $('crerr').textContent = '';
  $('chBack').parentNode.hidden = !CHARS.list.length;
  mode = 'newchar'; if (typeof crInit === 'function') crInit(); if (typeof loginLayout === 'function') loginLayout();
}
function closeCreate() {
  const rb = $('regbox'); if (chHome && rb.parentNode !== chHome) { chHome.appendChild(rb); rb.style.display = 'none'; }
  $('chmain').hidden = false; $('chCreate').hidden = true; if (mode === 'newchar') mode = 'login';
}
$('chNew').onclick = openCreate;
$('chBack').onclick = () => { closeCreate(); renderChars(); if (typeof loginLayout === 'function') loginLayout(); };
$('chMake').onclick = () => {
  const name = $('cn').value.trim(), ne = typeof nameErr === 'function' ? nameErr(name) : ''; if (ne) { $('crerr').textContent = ne; return; }
  $('chMake').disabled = true; ws.send(JSON.stringify({ t: 'newchar', name, ...look, portrait: crPortrait || undefined }));
  setTimeout(() => { $('chMake').disabled = false; }, 1500);
};
// ---- delete: step 1 warning, step 2 type the name; the server checks the name and the owner again
function openDelete() {
  const c = CHARS.list[chIdx]; if (!c) return;
  $('cdName').textContent = c.name; $('cdName2').textContent = c.name; $('cdInput').value = ''; $('cdGo').disabled = true;
  $('cdStep1').hidden = false; $('cdStep2').hidden = true; $('chDelBox').hidden = false;
}
$('chDel').onclick = openDelete;
$('cdNext').onclick = () => { $('cdStep1').hidden = true; $('cdStep2').hidden = false; $('cdInput').focus(); };
$('cdInput').oninput = () => { const c = CHARS.list[chIdx]; $('cdGo').disabled = !c || $('cdInput').value.trim().toLowerCase() !== c.name.toLowerCase(); };
$('cdGo').onclick = () => { const c = CHARS.list[chIdx]; if (!c) return; ws.send(JSON.stringify({ t: 'delchar', id: c.id, name: $('cdInput').value.trim(), confirm: 1 })); $('chDelBox').hidden = true; };
document.querySelectorAll('#chDelBox .cdX').forEach(b => b.onclick = () => { $('chDelBox').hidden = true; });
$('chOut').onclick = () => { const sv = store.get('ely_session'); if (sv && ws) { try { ws.send(JSON.stringify({ t: 'revoke', tok: sv.tok })); } catch (e) { } store.set('ely_session', null); } setTimeout(() => location.reload(), 150); };
function onCharErr(m) { if (!$('chCreate').hidden) $('crerr').textContent = m.m; $('chErr').textContent = m.m; $('chEnter').innerHTML = 'เข้าเกม ›'; renderChars(); }
// back from the world to the select screen (same connection and session)
function leaveWorldUI() {
  try { closeWins(); setAuto(false); clearTarget(); } catch (e) { }
  me = null; map = null; ents.clear(); $('hud').style.display = 'none'; $('dead').style.display = 'none';
  $('chEnter').innerHTML = 'เข้าเกม ›';
}
function charSelect() { if (ws) ws.send(JSON.stringify({ t: 'charsel' })); }
// welcome: the select screen closes with the login screen
function chOnWelcome() { $('chsel').hidden = true; $('lbox').hidden = false; $('chEnter').innerHTML = 'เข้าเกม ›'; closeCreate(); }

// ============================================================ mailbox (read + claim; sending comes with the market)
function openMail() { closeWins(); $('wMail').style.display = 'block'; $('mailbody').innerHTML = '<div class="note">กำลังโหลด...</div>'; send({ t: 'mail', a: 'list' }); }
function onMail(m) {
  const B = $('mailbody'); if (!B) return;
  B.innerHTML = (m.list || []).map(x => `<div class="mrow"><b>${esc(x.subject)}</b> <small>จาก ${esc(x.from)} · ${new Date(x.at).toLocaleDateString('th-TH')}</small><div class="note">${esc(x.body || '')}</div>
    ${x.atts.length ? `<div>${x.atts.map(a => (a.item ? `${esc((ITEMS[a.item] || {}).n || '#' + a.item)} x${a.qty}` : '') + (a.gold ? ` 💰${a.gold.toLocaleString()}` : '')).join(' ')}</div>` : ''}
    ${x.atts.length && !x.claimed ? `<button data-c="${x.id}">รับของ</button>` : x.atts.length ? '<small>รับแล้ว ✔</small>' : ''}</div>`).join('') || '<div class="note">ไม่มีจดหมาย</div>';
  B.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => send({ t: 'mail', a: 'claim', id: +b.dataset.c }));
}

// ============================================================ GM window (shown only when the server says the account is GM / ADMIN)
let gmTab = 'overview';
function openGm() { if (!me || !me.role || me.role === 'PLAYER') return; closeWins(); $('wGm').style.display = 'block'; gmLoad(gmTab); }
function gmLoad(a) { gmTab = a; $('gmtabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === a)); $('gmbody').innerHTML = '<div class="note">กำลังโหลด...</div>'; send({ t: 'admin', a, q: a === 'accounts' ? ($('gmQ') && $('gmQ').value) || '' : undefined }); }
$('gmtabs').querySelectorAll('button').forEach(b => b.onclick = () => gmLoad(b.dataset.a));
const gmCmd = line => send({ t: 'chat', m: line });
$('gmGo').onclick = () => { const v = $('gmIn').value.trim(); if (!v) return; gmCmd(v.startsWith('/gm') ? v : '/gm ' + v); $('gmIn').value = ''; setTimeout(() => gmLoad(gmTab), 400); };
$('gmIn').onkeydown = e => { if (e.key === 'Enter') $('gmGo').click(); };
function onAdmin(m) {
  if (m.a !== gmTab) return; const B = $('gmbody'), d = m.data; let h = '';
  if (m.a === 'overview') h = `<div class="gmrow">ออนไลน์ <b>${d.online}</b> · บัญชี <b>${d.accounts}</b> · ตัวละคร <b>${d.characters}</b> · กิลด์ ${d.guilds} · ไอเทม ${d.items}</div><div class="gmrow">uptime ${Math.floor(d.uptime / 3600)} ชม. ${Math.floor(d.uptime % 3600 / 60)} นาที · RAM ${d.mem} MB · สิทธิ์ของคุณ: <b>${esc(d.role)}</b></div><div class="note">คำสั่งทั้งหมด: พิมพ์ /gm help ในช่องด้านล่าง ทุกคำสั่งถูกบันทึกใน GM Log</div>`;
  else if (m.a === 'players') h = d.map(o => `<div class="gmrow"><div class="grow">${esc(o.name)} <small>Lv${o.lv} ${esc(o.cls)} @${esc(o.map)} · ${esc(o.login)}${o.muted ? ' · มิวต์' : ''}</small></div><button data-g="/gm inspect ${esc(o.name)}">ดู</button><button data-g="/gm kick ${esc(o.name)}">เตะ</button><button data-f="mute ${esc(o.name)}">มิวต์</button></div>`).join('') || '<div class="note">ไม่มีผู้เล่นออนไลน์</div>';
  else if (m.a === 'accounts') h = `<div class="gmcmd"><input id="gmQ" placeholder="ค้นหา ไอดี / ชื่อตัวละคร"><button id="gmQGo">ค้นหา</button></div>` + d.map(a => `<div class="gmrow"><div class="grow">${esc(a.login)} <small>${a.role}${a.guest ? ' · guest' : ''}${a.banned ? ' · แบน' : ''}${a.muted ? ' · มิวต์' : ''}<br>${a.chars.map(esc).join(', ')}</small></div>${a.banned ? `<button data-g="/gm unban @${esc(a.login)}">ปลดแบน</button>` : `<button data-f="ban @${esc(a.login)}">แบน</button>`}</div>`).join('');
  else if (m.a === 'bans') h = '<b>แบน</b>' + d.bans.map(b => `<div class="gmrow"><div class="grow">${esc(b.login)} <small>${esc(b.reason)} · โดย ${esc(b.created_by)} · ${b.expires_at ? 'ถึง ' + new Date(b.expires_at).toLocaleString('th-TH') : 'ถาวร'}${b.lifted_at ? ' · ยกเลิกแล้ว' : ''}</small></div>${b.lifted_at ? '' : `<button data-g="/gm unban @${esc(b.login)}">ปลด</button>`}</div>`).join('') + '<b>มิวต์</b>' + d.mutes.map(b => `<div class="gmrow"><div class="grow">${esc(b.login)} <small>${esc(b.reason)} · ${b.expires_at ? 'ถึง ' + new Date(b.expires_at).toLocaleString('th-TH') : 'ถาวร'}${b.lifted_at ? ' · ยกเลิกแล้ว' : ''}</small></div>${b.lifted_at ? '' : `<button data-g="/gm unmute @${esc(b.login)}">ปลด</button>`}</div>`).join('');
  else if (m.a === 'audit') h = d.map(e => `<div class="gmrow"><div class="grow"><small>${new Date(e.at).toLocaleString('th-TH')}</small> ${esc(e.gm)} <b>${esc(e.action)}</b> ${esc(e.target || '')}${e.reason ? ` <small>(${esc(e.reason)})</small>` : ''}${e.ok ? '' : ' <small>✗</small>'}</div></div>`).join('') || '<div class="note">ยังไม่มีรายการ</div>';
  B.innerHTML = h;
  B.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => { gmCmd(b.dataset.g); setTimeout(() => gmLoad(gmTab), 400); });
  B.querySelectorAll('button[data-f]').forEach(b => b.onclick = () => { $('gmIn').value = `/gm ${b.dataset.f} 1d เหตุผล`; $('gmIn').focus(); });
  if ($('gmQGo')) $('gmQGo').onclick = () => { const q = $('gmQ').value; send({ t: 'admin', a: 'accounts', q }); };
}
function onGmInfo(m) { if ($('wGm').style.display !== 'block') return; const c = m.char; $('gmbody').innerHTML = `<pre>${esc(JSON.stringify({ char: { ...c, inv: c.inv.map(s => `${(ITEMS[s.id] || {}).n || s.id} x${s.q}`) }, account: m.account, ban: m.ban, mute: m.mute }, null, 1))}</pre>`; }
