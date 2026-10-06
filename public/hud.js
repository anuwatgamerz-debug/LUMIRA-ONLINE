'use strict';
// ============================================================ LUMIRA ONLINE — HUD helpers
// Original 16x16 pixel icons drawn in code (no third-party art), responsive UI scale and player settings.
(function () {
  // ---------------------------------------------------------- icons
  const PAL = {
    k: '#1a1226', w: '#f4f1e6', W: '#c9cfdb', g: '#8892a6', G: '#4b5368', y: '#f2c94c', Y: '#b8862b', o: '#e8873a',
    r: '#d94a4a', R: '#8e2a2a', b: '#a8743f', B: '#d6a46a', d: '#6e4521', p: '#8b6cf0', P: '#c2b0ff', u: '#4c8ff0',
    U: '#a8d0ff', n: '#58b04a', N: '#a8e38a', s: '#f0c49a', t: '#5ad1c8', e: '#efe0b4', E: '#c9b27a',
  };
  const ART = {
    bag: [
      '................', '.....kkkkkk.....', '....kyYYYYyk....', '.....kkkkkk.....', '....kbBbbbbk....', '...kbBbbbbbbk...',
      '..kbBbbbbbbbbk..', '..kbBbbbbbbbbk..', '..kbbbbkkbbbbk..', '..kbbbkyykbbbk..', '..kbbbbkkbbbbk..', '..kbbbbbbbbbbk..',
      '..kdbbbbbbbbdk..', '...kddddddddk...', '....kkkkkkkk....', '................'],
    skill: [
      '.......kk.......', '......kyyk......', '......kyyk......', '.kk..kyyyyk..kk.', '.kykkyyyyyykkyk.', '..kyyyywwyyyyk..',
      '...kyywwwwyyk...', '..kyyywwwwyyyk..', '.kyyyyywwyyyyyk.', '..kkkyyyyyykkk..', '....kyyyyyyk....', '...kyyk..kyyk...',
      '..kyk......kyk..', '..kk........kk..', '................', '................'],
    equip: [
      '................', '..kkkkkkkkkkkk..', '..kWwwwwuuuuuk..', '..kWwwwwuuuuuk..', '..kWwwwwuUuuuk..', '..kWwwwwuuuuuk..',
      '..kuuuuuwwwwwk..', '..kuuuuuwwwwgk..', '...kuuuuwwwwk...', '...kuuuuwwwgk...', '....kuuuwwgk....', '.....kuuwgk.....',
      '......kugk......', '.......kk.......', '................', '................'],
    quest: [
      '................', '...kkkkkkkkkk...', '..kBeeeeeeeeBk..', '..kdkkkkkkkkdk..', '...keeeeeeeek...', '...kekkkkkeek...',
      '...keeeeeeeek...', '...kekkkkeeek...', '...keeeeeeeek...', '...kekkkkkkek...', '...keeeeeeeek...', '...kekkkeeeek...',
      '..kdkkkkkkkkdk..', '..kBeeeeeeeeBk..', '...kkkkkkkkkk...', '................'],
    map: [
      '................', '.kkkkkkkkkkkkkk.', '.keeeEeeeeEeeek.', '.kennEeeueEeeek.', '.knnnEeuuEeerek.', '.kennEeeueEerrk.',
      '.keeeEeeeeEeeek.', '.keeeEnneeEeeek.', '.keueEnnneEeeek.', '.kuuuEeeeeEnnek.', '.keueEeeeeEnnnk.', '.keeeEeeeeEeeek.',
      '.kkkkkkkkkkkkkk.', '................', '................', '................'],
    party: [
      '................', '...kkk.....kkk..', '..ksssk...ksssk.', '..ksssk...ksssk.', '..ksssk...ksssk.', '...kkk.....kkk..',
      '..kuuuk...knnnk.', '.kuuuuuk.knnnnnk', '.kuUuuuk.knNnnnk', '.kuuuuuk.knnnnnk', '.kuuuuuk.knnnnnk', '.kkkkkkk.kkkkkkk',
      '................', '................', '................', '................'],
    guild: [
      '................', '..kk............', '..kgkkkkkkkkk...', '..kgkrrrrrrrrk..', '..kgkrrryyrrrk..', '..kgkrryyyyrrk..',
      '..kgkrrryyrrk...', '..kgkrrrrrrrk...', '..kgkrrrrrrrrk..', '..kgkkkkkkkkk...', '..kgk...........', '..kgk...........',
      '..kgk...........', '..kgk...........', '.kkkkk..........', '................'],
    auto: [
      '.......kk.......', '.......kyk......', '....kkkkkkkk....', '...kWWWWWWWWk...', '...kWkkWWkkWk...', '..kWWktWWktWWk..',
      '..kWWkkWWkkWWk..', '..kWWWWWWWWWWk..', '..kWWWkkkkWWWk..', '...kWWWWWWWWk...', '....kkkkkkkk....', '...kgggggggggk..',
      '..kgkgggggggkgk.', '..kkkgggggggkkk.', '....kkkkkkkkk...', '................'],
    attack: [
      '.............kk.', '............kwwk', '...........kwWk.', '..........kwWk..', '.........kwWk...', '........kwWk....',
      '...k...kwWk.....', '...kk.kwWk......', '....kkwWk.......', '....kykk........', '...kykkyk.......', '..kyk..kk.......',
      '.kyk............', 'kyk.............', 'kk..............', '................'],
    loot: [
      '................', '................', '.....kkkkkk.....', '....kUUwwUUk....', '...kUwwUUwwUk...', '..kkkkkkkkkkkk..',
      '..kuuUuuuuUuuk..', '...kuuUuuUuuk...', '....kuuUUuuk....', '.....kuuuuk.....', '......kuuk......', '.......kk.......',
      '................', '................', '................', '................'],
    chat: [
      '................', '..kkkkkkkkkkkk..', '.kwwwwwwwwwwwwk.', '.kwwwwwwwwwwwwk.', '.kwkkwwkkwwkkwk.', '.kwkkwwkkwwkkwk.',
      '.kwwwwwwwwwwwwk.', '.kWwwwwwwwwwwWk.', '..kkkkwwkkkkkk..', '.....kwwk.......', '....kwk.........', '....kk..........',
      '................', '................', '................', '................'],
    potion: [
      '................', '......kkkk......', '......kddk......', '.....kkkkkk.....', '......kwwk......', '.....kwwwwk.....',
      '....krrrrrrk....', '...krwrrrrrrk...', '...krwrrrrrrk...', '...krrrrrrrrk...', '...kRrrrrrrRk...', '....kRRRRRRk....',
      '.....kkkkkk.....', '................', '................', '................'],
    char: [
      '................', '.....kkkkkk.....', '....kddddddk....', '...kddsssssdk...', '...kdsksskssk...', '...kssssssssk...',
      '....ksssssk.....', '.....kkkkkk.....', '...kuuuuuuuuk...', '..kuuUuuuuuuuk..', '..kuukuuuukuuk..', '..kssk....kssk..',
      '...kk.kuuk.kk...', '......kggk......', '.....kkkkkk.....', '................'],
    sk_heal: [
      '................', '......kkkk......', '......knnk......', '......kNnk......', '......knnk......', '..kkkkknnkkkkk..',
      '..kNNNNnnnnnnk..', '..knnnnnnnnnnk..', '..kkkkknnkkkkk..', '......knnk......', '......knnk......', '......knnk......',
      '......kkkk......', '................', '................', '................'],
    sk_twin: [
      'kk............kk', 'kWk..........kWk', '.kWk........kWk.', '..kWk......kWk..', '...kWk....kWk...', '....kWk..kWk....',
      '.....kWkkWk.....', '......kWWk......', '......kWWk......', '.....kykkyk.....', '....kyk..kyk....', '...kyk....kyk...',
      '..kkk......kkk..', '................', '................', '................'],
  };
  // procedural shapes, outlined automatically
  const SHAPE = {
    gear: (x, y) => { const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (r < 2.2) return 0; if (r < 4.8) return 'W'; if (r < 6.6 && Math.cos(a * 8) > 0.25) return 'g'; return 0; },
    coin: (x, y) => { const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy); if (r > 6.4) return 0; if (r > 5.2) return 'Y'; if ((x === 6 || x === 9) && y > 4 && y < 11) return 'Y'; return dx + dy < -3 ? 'w' : 'y'; },
    target: (x, y) => { const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy); if (r > 5 && r < 6.6) return 'r'; if ((x === 7 || x === 8) && (y < 4 || y > 11)) return 'r'; if ((y === 7 || y === 8) && (x < 4 || x > 11)) return 'r'; if (r < 1.6) return 'y'; return 0; },
    more: (x, y) => { for (const cx of [3, 8, 13]) if (Math.hypot(x - cx + 0.5, y - 7.5) < 1.9) return 'w'; return 0; },
    sk_bolt: (x, y) => { const r = Math.hypot(x - 9.5, y - 6.5); if (r < 2) return 'w'; if (r < 3.4) return 'U'; if (r < 4.6) return 'u'; const t = (x - 1) / 8; if (x < 9 && Math.abs(y - (6.5 + (9.5 - x) * 0.9)) < 1.6 - t * 0.2 && x > 1) return x % 3 ? 'u' : 'U'; return 0; },
    sk_focus: (x, y) => { const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5); if (dx + dy < 2.5) return 'w'; if (dx + dy < 4.5) return 'P'; if ((dx < 1 && dy < 7) || (dy < 1 && dx < 7)) return 'p'; if (Math.abs(dx - dy) < 0.9 && dx < 4.6) return 'P'; return 0; },
    sk_cleave: (x, y) => { const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (r > 4.2 && r < 6.8 && ((a + Math.PI) % (Math.PI * 2 / 3)) < 1.5) return r > 5.6 ? 'o' : 'y'; if (r < 2) return 'W'; return 0; },
    interact: (x, y) => { const dx = x - 7.5, dy = y - 6.5, r = Math.hypot(dx, dy); if (y > 12 && x > 5 && x < 10) return y === 15 ? 0 : 'y'; if (r < 6 && !(r < 2.4 && dy > 0)) return y < 4 ? 'w' : 'y'; return 0; },
  };
  const cache = {};
  function pix(name) {
    if (cache[name]) return cache[name];
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    const at = [];
    if (ART[name]) ART[name].forEach((row, y) => { for (let x = 0; x < 16; x++) { const ch = row[x] || '.'; at[y * 16 + x] = ch === '.' ? 0 : ch; } });
    else if (SHAPE[name]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) at[y * 16 + x] = SHAPE[name](x, y);
      const filled = at.slice();
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!filled[y * 16 + x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => filled[(y + b) * 16 + x + a] && x + a >= 0 && x + a < 16)) at[y * 16 + x] = 'k';
    }
    for (let i = 0; i < 256; i++) if (at[i]) { g.fillStyle = PAL[at[i]] || at[i]; g.fillRect(i % 16, i >> 4, 1, 1); }
    return (cache[name] = c);
  }
  const urls = {};
  const iconURL = name => urls[name] || (urls[name] = pix(name).toDataURL());

  // ---------------------------------------------------------- UI art (public/assets/ui, built by tools/build_ui_assets.py)
  // Pure visual layer: an element keeps its id/events; if its data-icon (or data-skin) has art in the atlas it is drawn
  // with that art, otherwise with the pixel icon above. If ui.json never loads the game simply keeps the pixel icons.
  const UI = { man: null };
  const SKIN = {   // data-icon -> sprite (atlas cell or single file in ui.json)
    attack: 'attack', potion: 'btn_potion', loot: 'btn_pick', interact: 'btn_talk', target: 'btn_target',
    // top menu / More menu / gold
    skill: 'menu_skill', equip: 'menu_equip', bag: 'menu_bag', quest: 'menu_quest', map: 'menu_map', party: 'menu_party',
    guild: 'menu_guild', auto: 'menu_auto', gear: 'menu_settings', more: 'menu_more', coin: 'menu_gold', chat: 'btn_talk',
  };
  function spriteStyle(name) {
    const m = UI.man; if (!m || !name) return null;
    if (m[name] && m[name].file && !m[name].map) return { img: `url(assets/ui/${m[name].file})`, size: 'contain', pos: '50% 50%' };
    for (const k of ['icons', 'items']) {
      const a = m[k]; const i = a && a.map[name]; if (i == null) continue;
      const c = i % a.cols, r = Math.floor(i / a.cols);
      return { img: `url(assets/ui/${a.file})`, size: `${a.cols * 100}% ${a.rows * 100}%`, pos: `${a.cols > 1 ? c / (a.cols - 1) * 100 : 0}% ${a.rows > 1 ? r / (a.rows - 1) * 100 : 0}%` };
    }
    return null;
  }
  // paint an element with a sprite (atlas cells are square, so the element should be square too)
  function sprite(el, name) {
    const s = spriteStyle(name); if (!s) return false;
    el.style.backgroundImage = s.img; el.style.backgroundSize = s.size; el.style.backgroundPosition = s.pos; el.style.backgroundRepeat = 'no-repeat';
    return true;
  }
  // atlas image + cell lookup for canvas drawing (loaded on first use)
  const atlasImg = {};
  function atlasCell(kind, name) {
    const a = UI.man && UI.man[kind]; if (!a || a.map[name] == null) return null;
    let im = atlasImg[kind]; if (!im) { im = atlasImg[kind] = new Image(); im.src = 'assets/ui/' + a.file; }
    if (!im.complete || !im.naturalWidth) return null;
    const i = a.map[name]; return { im, sx: (i % a.cols) * a.cell, sy: Math.floor(i / a.cols) * a.cell, s: a.cell };
  }
  function applyIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      let i = el.classList.contains('pi') ? el : el.querySelector(':scope > i.pi');
      if (!i) { i = document.createElement('i'); i.className = 'pi'; el.prepend(i); }
      const art = UI.man && (el.dataset.skin || SKIN[el.dataset.icon]);
      if (art && sprite(i, art)) { el.classList.add('skinned'); return; }
      el.classList.remove('skinned');
      i.style.backgroundSize = i.style.backgroundPosition = '';
      i.style.backgroundImage = `url(${iconURL(el.dataset.icon)})`;
    });
  }
  fetch('assets/ui/ui.json').then(r => r.json()).then(m => {
    UI.man = m; document.body.classList.add('skin'); applyIcons();
    dispatchEvent(new Event('uiskin')); // let renderers that draw sprites (hotbar, canvas) refresh
  }).catch(() => { });

  // ---------------------------------------------------------- settings
  const DEF = { uiSize: 1, zoom: 'normal', joy: 'float', names: true, fps: false, qCol: false };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('lmo_set') || '{}') || {}; } catch (e) { }
  const S = Object.assign({}, DEF, saved);
  function saveSettings() { try { localStorage.setItem('lmo_set', JSON.stringify(S)); } catch (e) { } layout(); }

  // ---------------------------------------------------------- responsive layout
  // --ui is the HUD scale; html font-size = 10px * --ui so the HUD is sized in rem.
  // Landscape phones are short, so they get a smaller base than portrait for the same short side.
  function layout() {
    const w = innerWidth, h = innerHeight, portrait = h >= w;
    const ui = Math.max(0.74, Math.min(1.2, Math.min(w, h) / (portrait ? 400 : 440))) * (+S.uiSize || 1);
    const root = document.documentElement;
    root.style.setProperty('--ui', ui.toFixed(3));
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('landscape', !portrait);
    fitBar();
  }
  // move low-priority top-bar buttons into "More" when the bar doesn't fit
  function fitBar() {
    const bar = document.getElementById('topbar'); if (!bar || !bar.offsetParent) return;
    document.body.classList.remove('barc1', 'barc2');
    if (bar.scrollWidth > bar.clientWidth + 1) document.body.classList.add('barc1');
    if (bar.scrollWidth > bar.clientWidth + 1) document.body.classList.add('barc2');
  }
  addEventListener('resize', layout);
  if (window.visualViewport) visualViewport.addEventListener('resize', layout); // iOS toolbar show/hide changes the usable height
  addEventListener('orientationchange', () => setTimeout(layout, 150));

  window.HUD = { icon: pix, iconURL, applyIcons, S, saveSettings, layout, fitBar, UI, SKIN, sprite, atlasCell };
})();
