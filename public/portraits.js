'use strict';
// ============================================================ ELYNDRA ONLINE — character portraits (cosmetic only)
// One registry for every portrait. Characters store only `portraitId`; every screen asks this file for the image,
// and the server (which loads the same file) refuses ids that aren't listed here — never a URL from the client.
// Portraits have no gameplay effect and are not tied to a class: style / sex are only gallery filters.
// type: NORMAL (free for everyone) · RARE · EVENT · ACHIEVEMENT · CLASS (future: need an unlock, shown with 🔒)
const PORTRAIT_DEFAULT = 'portrait_default';
const PORTRAIT_TYPES = ['NORMAL', 'RARE', 'EVENT', 'ACHIEVEMENT', 'CLASS'];
const PORTRAITS = [
  { id: 'portrait_001', sex: 'm', style: 'adventurer', type: 'NORMAL', th: 'นักผจญภัยผมน้ำตาล' },
  { id: 'portrait_002', sex: 'f', style: 'adventurer', type: 'NORMAL', th: 'นักเดินทางผมเงิน' },
  { id: 'portrait_003', sex: 'm', style: 'rogue', type: 'NORMAL', th: 'นักย่องเงาผิวเข้ม' },
  { id: 'portrait_004', sex: 'f', style: 'archer', type: 'NORMAL', th: 'นักธนูแห่งพงไพร' },
  { id: 'portrait_005', sex: 'm', style: 'warrior', type: 'NORMAL', th: 'อัศวินเกราะเงิน' },
  { id: 'portrait_006', sex: 'f', style: 'mage', type: 'NORMAL', th: 'จอมเวทแสงจันทร์' },
  { id: 'portrait_007', sex: 'm', style: 'priest', type: 'NORMAL', th: 'นักบวชแห่งรุ่งอรุณ' },
  { id: 'portrait_008', sex: 'f', style: 'rogue', type: 'NORMAL', th: 'นักฆ่าผ้าพันคอแดง' },
];
// gallery filters (category = filter only, never a restriction)
const PORTRAIT_FILTERS = [['all', 'ทั้งหมด'], ['m', 'ชาย'], ['f', 'หญิง'], ['adventurer', 'นักผจญภัย'], ['warrior', 'นักรบ'], ['mage', 'นักเวท'], ['archer', 'นักธนู'], ['priest', 'นักบวช'], ['rogue', 'โจร']];
const PORTRAIT_BY_ID = Object.fromEntries(PORTRAITS.map(p => [p.id, p]));
const portraitOf = id => PORTRAIT_BY_ID[id] || null;
// can this character use it? NORMAL: always. Others: the id must be in the character's unlocked list (c.portraits).
const portraitAllowed = (id, c) => { const p = portraitOf(id); return !!p && (p.type === 'NORMAL' || !!(c && Array.isArray(c.portraits) && c.portraits.includes(id))); };
// deterministic default for characters made before portraits existed: same body type, picked by name
function portraitFallback(look, name) {
  const sex = look && look.sex ? 'f' : 'm', list = PORTRAITS.filter(p => p.type === 'NORMAL' && p.sex === sex);
  if (!list.length) return PORTRAIT_DEFAULT;
  let h = 0; for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return list[h % list.length].id;
}
// image paths (only this file knows them). size: 'thumb' (gallery) | 'hud' (circle crop) | 'full' (big preview)
function portraitSrc(id, size) {
  if (!portraitOf(id)) return 'assets/portraits/portrait_default.png';
  return `assets/portraits/${size === 'full' ? 'full' : size === 'thumb' ? 'thumbnails' : 'hud'}/${id}.webp`;
}

if (typeof window === 'undefined') module.exports = { PORTRAITS, PORTRAIT_TYPES, PORTRAIT_DEFAULT, PORTRAIT_FILTERS, portraitOf, portraitAllowed, portraitFallback, portraitSrc };
else window.PORTRAIT = (function () {
  const DEF = 'assets/portraits/portrait_default.png';
  const cache = new Map();
  // an <img> that falls back to the default medallion if the file is missing (never breaks the UI)
  function setImg(el, id, size) {
    const src = portraitSrc(id, size || 'hud');
    if (el.dataset.src === src) return; el.dataset.src = src;
    el.onerror = () => { el.onerror = null; el.src = DEF; }; el.src = src; el.alt = (portraitOf(id) || {}).th || '';
  }
  function preload(id, size) { const s = portraitSrc(id, size); if (cache.has(s)) return; const i = new Image(); i.src = s; cache.set(s, i); }
  // gallery: filters + grid. opts: { sel, char, onPick(id), onPreview(id) }. Tap = select, tap the selected one again = big preview.
  function gallery(root, opts) {
    let filt = 'all', sel = opts.sel;
    root.classList.add('pgal');
    root.innerHTML = `<div class="pfil">${PORTRAIT_FILTERS.map(([k, t]) => `<button type="button" data-f="${k}">${t}</button>`).join('')}</div><div class="pgrid"></div>`;
    const grid = root.querySelector('.pgrid');
    function render() {
      root.querySelectorAll('.pfil button').forEach(b => b.classList.toggle('on', b.dataset.f === filt));
      const list = PORTRAITS.filter(p => filt === 'all' || p.sex === filt || p.style === filt);
      grid.innerHTML = list.map(p => { const ok = portraitAllowed(p.id, opts.char); return `<button type="button" class="pcell${p.id === sel ? ' on' : ''}${ok ? '' : ' lock'}" data-id="${p.id}" title="${p.th}" aria-label="${p.th}"><img loading="lazy" decoding="async" alt=""><i>${ok ? '' : '🔒'}</i></button>`; }).join('') || '<div class="note">ไม่มีภาพในหมวดนี้</div>';
      grid.querySelectorAll('.pcell').forEach(b => {
        setImg(b.querySelector('img'), b.dataset.id, 'thumb');
        b.onclick = () => {
          const id = b.dataset.id; if (b.classList.contains('lock')) return;
          if (id === sel) { opts.onPreview && opts.onPreview(id); return; }
          sel = id; grid.querySelectorAll('.pcell').forEach(x => x.classList.toggle('on', x.dataset.id === sel));
          preload(id, 'full'); opts.onPick && opts.onPick(id);
        };
      });
      // warm the neighbours of the selected portrait only (not the whole list)
      const i = PORTRAITS.findIndex(p => p.id === sel); for (const j of [i - 1, i + 1]) if (PORTRAITS[j]) preload(PORTRAITS[j].id, 'hud');
    }
    root.querySelectorAll('.pfil button').forEach(b => b.onclick = () => { filt = b.dataset.f; render(); });
    render();
    return { get sel() { return sel; }, set(id) { sel = id; render(); } };
  }
  // full-screen preview: the big bust + how the in-game HUD will look
  function preview(id, name) {
    let o = document.getElementById('pbig');
    if (!o) { o = document.createElement('div'); o.id = 'pbig'; document.body.appendChild(o); o.onclick = e => { if (e.target === o || e.target.closest('.px')) o.style.display = 'none'; }; }
    const p = portraitOf(id) || { th: '' };
    o.innerHTML = `<div class="pbx"><button type="button" class="px">✕</button><img class="pfull" alt=""><div class="pth">${p.th}</div>
      <div class="phud"><span class="pc"><img alt=""></span><div class="pnm"><b></b><div class="phb hp"><i></i></div><div class="phb sp"><i></i></div></div></div><div class="note">ตัวอย่างกรอบตัวละครในเกม</div></div>`;
    setImg(o.querySelector('.pfull'), id, 'full'); setImg(o.querySelector('.pc img'), id, 'hud'); o.querySelector('.pnm b').textContent = name || 'ชื่อตัวละคร';
    o.style.display = 'flex';
  }
  return { list: PORTRAITS, of: portraitOf, src: portraitSrc, allowed: portraitAllowed, fallback: portraitFallback, setImg, preload, gallery, preview, DEFAULT: DEF };
})();
