// ============================================================ LUMIRA ONLINE — AudioManager
// The one audio system of the game. Game code calls ids from the audio registry (audio-registry.js); this file
// owns the AudioContext, the volume buses (master / music / sfx / ambient / voice), music crossfades and
// overrides (boss / event), ambient beds, positional sound, voice limits, priority, ducking and the mobile
// unlock. Every public call is wrapped so an audio failure can never stop the game.
(function () {
  'use strict';
  const REG = window.AUDIO_REG, SYN = window.AUDIO_SYNTH;
  const AC = window.AudioContext || window.webkitAudioContext;
  const LS = 'lmo_audio', DEF = { master: 80, music: 60, sfx: 80, ambient: 50, voice: 80, muted: false };
  const LIMIT = { sfx: 20, monster: 6, perId: 3 }; // simultaneous voices: all SFX / positional monster sounds / one id
  const HEAR = 15; // tiles: positional sounds are silent beyond this
  let set = Object.assign({}, DEF); try { Object.assign(set, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { }
  let ctx = null, bus = null, unlocked = false, hidden = false;
  const stat = { played: {}, dropped: { cooldown: 0, limit: 0, locked: 0, far: 0, missing: 0 }, log: [], missing: {}, tracks: 0 };
  const bufs = {}, loading = {}, lastPlay = {}, voices = [];
  const listener = { x: 0, y: 0 };
  const safe = f => function () { try { return f.apply(this, arguments); } catch (e) { if (window.console) console.warn('[audio]', e && e.message); return false; } };
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(set)); } catch (e) { } };
  const defOf = id => REG.SFX[id] || REG.MUSIC[id] || REG.AMBIENT[id] || null;
  const now = () => (ctx ? ctx.currentTime : 0);

  // ---------------------------------------------------------------- context + buses
  function init() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    const g = () => ctx.createGain();
    bus = { master: g(), music: g(), duck: g(), sfx: g(), ambient: g(), voice: g() };
    bus.music.connect(bus.duck); bus.duck.connect(bus.master);
    for (const k of ['sfx', 'ambient', 'voice']) bus[k].connect(bus.master);
    bus.master.connect(ctx.destination);
    applyVolumes(true);
    return true;
  }
  function applyVolumes(instant) {
    if (!ctx) return;
    const t = now(), v = (node, x) => { if (instant) node.gain.value = x; else node.gain.setTargetAtTime(x, t, 0.05); };
    v(bus.master, set.muted ? 0 : set.master / 100); v(bus.music, set.music / 100); v(bus.sfx, set.sfx / 100); v(bus.ambient, set.ambient / 100); v(bus.voice, set.voice / 100);
  }
  // browsers only allow sound after a user gesture: the first tap / click / key unlocks (and starts the music softly)
  function unlock() {
    if (unlocked) return true;
    if (!init()) return false;
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { } // iOS needs a sound inside the gesture
    const done = () => { if (ctx.state !== 'running' || unlocked) return; unlocked = true; for (const e of GESTURES) removeEventListener(e, onGesture, true); refreshMusic(1.8); refreshAmbient(2.5); warm(); };
    const p = ctx.resume && ctx.resume(); if (p && p.then) p.then(done, () => { }); done();
    return unlocked;
  }
  const GESTURES = ['pointerdown', 'touchend', 'keydown', 'click'];
  const onGesture = () => { try { unlock(); } catch (e) { } };
  for (const e of GESTURES) addEventListener(e, onGesture, true);
  document.addEventListener('visibilitychange', () => { // background tab: suspend everything; back: resume once
    try { hidden = document.hidden; if (!ctx || !unlocked) return; if (hidden) ctx.suspend(); else ctx.resume(); } catch (e) { }
  });
  const ready = () => !!(ctx && unlocked && ctx.state === 'running' && !hidden);

  // ---------------------------------------------------------------- buffers: real file when present, synth otherwise
  function synthBuffer(def) {
    if (bufs['syn:' + def.id]) return bufs['syn:' + def.id];
    const data = SYN.render(def.synth), b = ctx.createBuffer(1, data.length, SYN.SR);
    if (b.copyToChannel) b.copyToChannel(data, 0); else b.getChannelData(0).set(data);
    return (bufs['syn:' + def.id] = b);
  }
  function loadFile(id) {
    const def = defOf(id); if (!def || !def.file || loading[id] || !ctx) return;
    const urls = [def.file, def.alt].filter(Boolean).map(f => REG.base + f);
    loading[id] = (async () => {
      for (const u of urls) {
        try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); const ab = await r.arrayBuffer(); bufs['file:' + id] = await new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no)); return; } catch (e) { }
      }
      stat.missing[id] = urls; stat.dropped.missing++; // keeps using the synth placeholder
    })();
  }
  const bufferFor = def => bufs['file:' + def.id] || (def.synth ? synthBuffer(def) : null);
  // only what's needed soon: UI + common combat sounds now, the rest on first use; map files when the map loads
  const WARM = ['ui_click', 'ui_open', 'ui_close', 'ui_confirm', 'ui_error', 'ui_tab', 'hit_normal', 'hit_critical', 'miss', 'sword_swing', 'sword_hit', 'damage_taken', 'heal', 'level_up', 'pickup_normal', 'quest_progress'];
  function warm() { let i = 0; const step = () => { if (i >= WARM.length) return; const d = REG.SFX[WARM[i++]]; if (d) { synthBuffer(d); loadFile(d.id); } setTimeout(step, 30); }; step(); }
  function preload(ids) { if (!ctx) return; for (const id of ids) if (defOf(id)) loadFile(id); }

  // ---------------------------------------------------------------- SFX: priority, limits, cooldowns, distance
  function distGain(x, y) { const d = Math.hypot(x - listener.x, y - listener.y); return d <= 3 ? 1 : Math.max(0, 1 - (d - 3) / (HEAR - 3)); }
  function stopVoice(v) { try { v.src.stop(); } catch (e) { } }
  function playSFX(id, o = {}) {
    const def = REG.SFX[id]; if (!def) { stat.dropped.missing++; return false; }
    if (!ready()) { stat.dropped.locked++; return false; }
    const t = performance.now();
    if (t - (lastPlay[id] || -1e9) < (def.cd || 0)) { stat.dropped.cooldown++; return false; }
    let g = (def.vol || 1) * (o.vol == null ? 1 : o.vol);
    const positional = o.x != null && o.y != null;
    if (positional) { g *= distGain(o.x, o.y); if (g < 0.03) { stat.dropped.far++; return false; } }
    const prio = o.prio != null ? o.prio : def.prio;
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end < now()) voices.splice(i, 1);
    const same = voices.filter(v => v.id === id); if (same.length >= LIMIT.perId) { stopVoice(same[0]); voices.splice(voices.indexOf(same[0]), 1); }
    const mon = !!def.family || o.monster;
    if (mon && voices.filter(v => v.mon).length >= LIMIT.monster) { stat.dropped.limit++; return false; }
    if (voices.length >= LIMIT.sfx) { // steal the oldest voice of the lowest priority, if it ranks below this one
      let w = null; for (const v of voices) if (v.prio < prio && (!w || v.prio < w.prio || (v.prio === w.prio && v.start < w.start))) w = v;
      if (!w) { stat.dropped.limit++; return false; }
      stopVoice(w); voices.splice(voices.indexOf(w), 1);
    }
    const buf = bufferFor(def); if (!buf) return false;
    if (def.file && !bufs['file:' + id]) loadFile(id);
    const src = ctx.createBufferSource(), gn = ctx.createGain(); src.buffer = buf; if (o.rate) src.playbackRate.value = o.rate;
    gn.gain.value = g; src.connect(gn);
    if (positional && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = Math.max(-0.8, Math.min(0.8, (o.x - listener.x) / 10)); gn.connect(pn); pn.connect(bus.sfx); } else gn.connect(bus.sfx);
    src.start(); lastPlay[id] = t;
    voices.push({ id, src, prio, mon, start: now(), end: now() + buf.duration });
    stat.played[id] = (stat.played[id] || 0) + 1; stat.log.push([id, Math.round(t)]); if (stat.log.length > 80) stat.log.shift();
    if (def.duck) duck(def.duck, buf.duration * 1000 + 600);
    return true;
  }
  // lower the music for a moment (level up, boss start, class change); never stops it
  let duckUntil = 0;
  function duck(amount = 0.35, ms = 1500) {
    if (!ctx) return; const t = now(), d = bus.duck.gain;
    d.cancelScheduledValues(t); d.setTargetAtTime(1 - amount, t, 0.08);
    duckUntil = performance.now() + ms; setTimeout(() => { if (performance.now() >= duckUntil - 5 && ctx) bus.duck.gain.setTargetAtTime(1, now(), 0.4); }, ms);
  }

  // ---------------------------------------------------------------- music: map track + override stack (boss / event)
  // Tracks fade in/out on their own gain. The map track keeps its place under a boss/event track (silent, paused),
  // so coming back resumes it instead of starting over. Same id again = nothing happens (no restart).
  let mapBgm = null; const overrides = []; let cur = null; const parked = {};
  function want() { return overrides.length ? overrides[overrides.length - 1].id : mapBgm; }
  function refreshMusic(fade = 1.2) {
    if (!ctx || !unlocked) return;
    const id = want(); if (cur && cur.id === id) return;
    const old = cur; cur = null;
    if (old) { old.fade(0, fade); if (old.id === mapBgm && overrides.length) { parked[old.id] = old; setTimeout(() => old === parked[old.id] && old.pause(), fade * 1000 + 50); } else setTimeout(() => old.stop(), fade * 1000 + 100); }
    if (!id) return;
    if (parked[id]) { cur = parked[id]; delete parked[id]; cur.resume(); cur.fade(1, fade); return; }
    for (const k in parked) if (k !== mapBgm) { parked[k].stop(); delete parked[k]; }
    cur = makeTrack(id); cur.fade(1, fade);
  }
  function makeTrack(id) {
    const def = REG.MUSIC[id], g = ctx.createGain(); g.gain.value = 0.0001; g.connect(bus.music);
    const T = { id, gain: g, n: ++stat.tracks, live: true, fade(to, s) { const t = now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.linearRampToValueAtTime(Math.max(0.0001, to), t + Math.max(0.05, s)); } };
    let inner = null;
    if (def && def.file) {
      const el = new Audio(); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.src = REG.base + def.file;
      let src = null; try { src = ctx.createMediaElementSource(el); src.connect(g); } catch (e) { }
      const fallback = () => { if (!T.live || inner.kind === 'synth') return; stat.missing[id] = [def.file]; try { el.pause(); } catch (e) { } inner = synthMusic(def, g); };
      el.addEventListener('error', fallback); const pr = el.play(); if (pr && pr.catch) pr.catch(fallback);
      inner = { kind: 'file', pause: () => el.pause(), resume: () => el.play().catch(() => { }), stop: () => { el.pause(); el.src = ''; } };
    } else inner = synthMusic(def, g);
    T.pause = () => inner.pause(); T.resume = () => inner.resume(); T.stop = () => { T.live = false; inner.stop(); try { g.disconnect(); } catch (e) { } };
    return T;
  }
  // ---- generative placeholder score: chords from the theme's progression, a seeded melody, bass, pad, drums
  const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10], harmonicMinor: [0, 2, 3, 5, 7, 8, 11], phrygianDom: [0, 1, 4, 5, 7, 8, 10], pentaMajor: [0, 2, 4, 7, 9, 12, 14], wholeTone: [0, 2, 4, 6, 8, 10, 12], diminished: [0, 2, 3, 5, 6, 8, 9] };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function synthMusic(def, out) {
    const th = (def && def.theme) || { bpm: 90, root: 60, mode: 'major', prog: [0, 3, 4, 0], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0.3, density: 0.5, delay: 0.3, seed: 1 };
    const sc = MODES[th.mode] || MODES.major, beat = 60 / th.bpm, step = beat / 2;
    let s = th.seed || 1; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    // delay line gives the placeholder music some room
    const dl = ctx.createDelay(1.5), fb = ctx.createGain(), wet = ctx.createGain(); dl.delayTime.value = step * 3; fb.gain.value = 0.32; wet.gain.value = th.delay || 0.25;
    const dry = ctx.createGain(); dry.connect(out); dry.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
    // melody: 16 bars written once from the seed so the loop keeps its identity
    const prog = th.prog, bars = 16, mel = []; let deg = 4;
    for (let b = 0; b < bars; b++) for (let k = 0; k < 8; k++) {
      const strong = k % 2 === 0, play = r() < (strong ? th.density + 0.15 : th.density * 0.55);
      if (play) { deg += Math.round((r() - 0.5) * 3.2); if (strong && r() < 0.5) deg = prog[b % prog.length] + [0, 2, 4][Math.floor(r() * 3)]; deg = Math.max(0, Math.min(11, deg)); }
      mel.push(play ? deg : null);
    }
    const note = (deg, oct) => { const n = sc.length, o = Math.floor(deg / n); return th.root + oct * 12 + o * 12 + sc[((deg % n) + n) % n]; };
    function voice(t, f, d, w, v, dest = dry) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = w === 'bell' || w === 'drone' ? 'sine' : w; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (w === 'drone' ? 0.4 : 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05);
      if (w === 'bell') { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.frequency.value = f * 2.76; g2.gain.setValueAtTime(v * 0.35, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.5); o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t + d); }
    }
    let nbuf = null; const noise = () => { if (nbuf) return nbuf; nbuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nbuf; };
    function hit(t, kind, v) {
      if (kind === 'kick' || kind === 'tom') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(kind === 'kick' ? 120 : 200, t); o.frequency.exponentialRampToValueAtTime(kind === 'kick' ? 42 : 90, t + 0.15); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25); return; }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noise(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'hat' ? 0.04 : 0.14)); src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + 0.2);
    }
    let pos = 0, next = now() + 0.1, timer = null, paused = false;
    const L = 0.07, B = th.boss ? 0.12 : 0.09; // levels
    function tick() {
      while (next < now() + 0.3) {
        const bar = Math.floor(pos / 8) % bars, k = pos % 8, chord = prog[bar % prog.length], t = next;
        if (k === 0) { for (const dd of th.pad === 'drone' ? [0, 4] : [0, 2, 4]) voice(t, mtof(note(chord + dd, -1)), beat * 4.2, th.pad || 'sine', th.pad === 'drone' ? 0.035 : 0.03); }
        if (th.boss ? true : k % 4 === 0) voice(t, mtof(note(chord, -2)), th.boss ? step * 0.9 : beat * 1.8, th.bass || 'sine', B);
        const m = mel[(bar * 8 + k) % mel.length]; if (m != null) voice(t, mtof(note(m, 0)), th.lead === 'bell' ? beat * 1.6 : step * (th.boss ? 0.9 : 1.6), th.lead || 'triangle', th.lead === 'sawtooth' || th.lead === 'square' ? L * 0.6 : L);
        const dr = th.drums || 0;
        if (dr > 0.1 && (k === 0 || (k === 4 && dr > 0.25) || (th.boss && k % 2 === 0))) hit(t, 'kick', 0.25 * dr + 0.05);
        if (dr > 0.3 && (k === 2 || k === 6)) hit(t, 'snare', 0.12 * dr);
        if (dr > 0.2 && r() < dr * 0.7) hit(t, 'hat', 0.05 * dr);
        if (th.tribal && (k === 3 || k === 7) && r() < 0.6) hit(t, 'tom', 0.18);
        if (th.march && k === 7 && r() < 0.5) hit(t + step / 2, 'snare', 0.07);
        pos++; next += step;
      }
    }
    const start = () => { if (timer) return; next = Math.max(next, now() + 0.05); timer = setInterval(() => { try { tick(); } catch (e) { } }, 60); tick(); };
    start();
    return { kind: 'synth', pause() { paused = true; clearInterval(timer); timer = null; }, resume() { if (paused) { paused = false; start(); } }, stop() { clearInterval(timer); timer = null; setTimeout(() => { try { dry.disconnect(); wet.disconnect(); } catch (e) { } }, 300); } };
  }
  function playBGM(id, fade = 1.2) { if (id && !REG.MUSIC[id]) return false; if (mapBgm === id && cur && cur.id === want()) return true; mapBgm = id || null; if (id) preload([id]); refreshMusic(fade); return true; }
  function stopBGM(fade = 1.2) { mapBgm = null; overrides.length = 0; refreshMusic(fade); }
  function pushMusic(kind, id, fade = 1.0) { if (!REG.MUSIC[id]) return false; const top = overrides[overrides.length - 1]; if (top && top.kind === kind && top.id === id) return true; for (let i = overrides.length - 1; i >= 0; i--) if (overrides[i].kind === kind) overrides.splice(i, 1); overrides.push({ kind, id }); preload([id]); if (kind === 'boss') duck(0.3, 900); refreshMusic(fade); return true; }
  function popMusic(kind, fade = 1.6) { const n = overrides.length; for (let i = overrides.length - 1; i >= 0; i--) if (overrides[i].kind === kind) overrides.splice(i, 1); if (overrides.length !== n) refreshMusic(fade); }

  // ---------------------------------------------------------------- ambient beds
  let amb = null, ambId = null;
  function playAmbient(id, fade = 2) { if (id && !REG.AMBIENT[id]) return false; if (ambId === id) return true; ambId = id || null; if (id) preload([id]); refreshAmbient(fade); return true; }
  function stopAmbient(fade = 1.5) { ambId = null; refreshAmbient(fade); }
  function refreshAmbient(fade = 2) {
    if (!ctx || !unlocked) return;
    if (amb && amb.id === ambId) return;
    const old = amb; amb = null; if (old) { old.fade(0, fade); setTimeout(() => old.stop(), fade * 1000 + 100); }
    if (!ambId) return;
    amb = makeAmbient(ambId); amb.fade(1, fade);
  }
  function makeAmbient(id) {
    const def = REG.AMBIENT[id], g = ctx.createGain(); g.gain.value = 0.0001; g.connect(bus.ambient);
    const nodes = [], timers = [];
    const fadeFn = (to, s) => { const t = now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.linearRampToValueAtTime(Math.max(0.0001, to), t + s); };
    if (def.file) {
      const el = new Audio(); el.loop = true; el.src = REG.base + def.file; let ok = true;
      try { ctx.createMediaElementSource(el).connect(g); } catch (e) { ok = false; }
      el.addEventListener('error', () => { stat.missing[id] = [def.file]; synthAmb(); }); const pr = el.play(); if (pr && pr.catch) pr.catch(() => { });
      nodes.push({ stop: () => { el.pause(); el.src = ''; } });
    } else synthAmb();
    function synthAmb() {
      const L = def.layers, nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const bed = (type, f, q, lvl, lfoRate, lfoAmt) => { // filtered noise loop with a slow swell
        const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gg = ctx.createGain(); s.buffer = nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; gg.gain.value = lvl;
        if (lfoRate) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfoRate; og.gain.value = lvl * lfoAmt; o.connect(og); og.connect(gg.gain); o.start(); nodes.push(o); }
        s.connect(fl); fl.connect(gg); gg.connect(g); s.start(); nodes.push(s);
      };
      if (L.wind) bed('lowpass', L.wind.f, 0.7, L.wind.lvl * 0.5, 0.11, 0.6);
      if (L.water) bed('bandpass', L.water.f, 0.8, L.water.lvl * 0.6, 3.1, 0.25);
      if (L.leaves) bed('highpass', 4000, 0.7, L.leaves.lvl * 0.4, 0.4, 0.8);
      if (L.crowd) bed('bandpass', 650, 1.2, L.crowd.lvl * 0.7, 0.7, 0.5);
      if (L.rumble) bed('lowpass', 110, 0.8, L.rumble.lvl * 0.9, 0.07, 0.5);
      if (L.waves) bed('lowpass', 900, 0.6, L.waves.lvl * 0.7, 0.12, 0.9);
      if (L.hum) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.value = L.hum.f; gg.gain.value = L.hum.lvl * 0.4; o.connect(gg); gg.connect(g); o.start(); nodes.push(o); }
      // sparse one-shot details on a timer: birds, crickets, drips, clinks, crackle, gulls, shimmer
      const one = (t, f0, f1, d, v, w = 'sine') => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = w; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + d + 0.02); };
      const ev = { birds: t => { const b = 2200 + Math.random() * 1800; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) one(t + i * 0.09, b, b * (1.2 + Math.random() * 0.3), 0.07, 0.05); },
        crickets: t => { for (let i = 0; i < 4; i++) one(t + i * 0.05, 4600, 4500, 0.03, 0.025, 'square'); }, drips: t => { one(t, 1500 + Math.random() * 600, 700, 0.12, 0.08); },
        clinks: t => { one(t, 2600 + Math.random() * 800, 2400, 0.12, 0.03, 'triangle'); }, crackle: t => { one(t, 3000, 1000, 0.02, 0.06, 'square'); },
        gulls: t => { one(t, 1300, 900, 0.35, 0.04, 'sawtooth'); one(t + 0.4, 1250, 850, 0.3, 0.035, 'sawtooth'); }, shimmer: t => { for (let i = 0; i < 4; i++) one(t + i * 0.08, 2093 * Math.pow(1.26, i), 2093 * Math.pow(1.26, i), 0.4, 0.02); } };
      for (const k of Object.keys(ev)) if (L[k]) {
        const loop = () => { try { if (!hidden) ev[k](now() + 0.05); } catch (e) { } timers.push(setTimeout(loop, (0.5 + Math.random() * 1.5) * 1000 / L[k].rate)); };
        timers.push(setTimeout(loop, 400 + Math.random() * 1500));
      }
    }
    return { id, fade: fadeFn, stop() { for (const t of timers) clearTimeout(t); for (const n of nodes) { try { n.stop(); } catch (e) { } } try { g.disconnect(); } catch (e) { } } };
  }

  // ---------------------------------------------------------------- positional loops on the map (portals, campfires, smithy)
  let emitters = [], emitT = 0; const loopsOn = new Map();
  function setEmitters(list) { emitters = list || []; for (const [, l] of loopsOn) l.stop(); loopsOn.clear(); }
  function updateEmitters() {
    if (!ready()) return; const t = performance.now(); if (t - emitT < 250) return; emitT = t;
    const near = emitters.map((e, i) => ({ e, i, g: distGain(e.x, e.y) })).filter(o => o.g > 0.03).sort((a, b) => b.g - a.g).slice(0, 4);
    const keep = new Set(near.map(o => o.i));
    for (const [i, l] of loopsOn) if (!keep.has(i)) { l.stop(); loopsOn.delete(i); }
    for (const { e, i, g } of near) {
      const def = REG.SFX[e.id]; if (!def) continue;
      if (def.loop) {
        let l = loopsOn.get(i);
        if (!l) { const src = ctx.createBufferSource(), gn = ctx.createGain(); src.buffer = bufferFor(def); src.loop = true; gn.gain.value = 0.0001; src.connect(gn); gn.connect(bus.sfx); src.start(); l = { gn, stop: () => { try { src.stop(); } catch (er) { } } }; loopsOn.set(i, l); }
        l.gn.gain.setTargetAtTime(g * (def.vol || 1) * 0.6, now(), 0.2);
      } else if (t > (e.next || 0)) { e.next = t + (e.every || 1800) * (0.8 + Math.random() * 0.5); playSFX(e.id, { x: e.x, y: e.y }); }
    }
  }

  // ---------------------------------------------------------------- settings
  const clamp = v => Math.max(0, Math.min(100, Math.round(+v || 0)));
  const setVol = k => safe(v => { set[k] = clamp(v); save(); applyVolumes(); return set[k]; });
  function fadeOut(ms = 800) { if (ctx) bus.master.gain.setTargetAtTime(0, now(), ms / 3000); }
  function fadeIn(ms = 800) { if (ctx) bus.master.gain.setTargetAtTime(set.muted ? 0 : set.master / 100, now(), ms / 3000); }

  window.AUDIO = {
    unlock: safe(unlock), preload: safe(preload),
    playBGM: safe(playBGM), changeBGM: safe(playBGM), stopBGM: safe(stopBGM),
    bossEnter: safe(id => pushMusic('boss', id)), bossLeave: safe(() => popMusic('boss')), eventMusic: safe(id => pushMusic('event', id)), eventEnd: safe(() => popMusic('event')),
    playSFX: safe(playSFX), playAmbient: safe(playAmbient), stopAmbient: safe(stopAmbient),
    setMasterVolume: setVol('master'), setMusicVolume: setVol('music'), setSFXVolume: setVol('sfx'), setAmbientVolume: setVol('ambient'), setVoiceVolume: setVol('voice'),
    mute: safe(() => { set.muted = true; save(); applyVolumes(); }), unmute: safe(() => { set.muted = false; save(); applyVolumes(); }),
    fadeIn: safe(fadeIn), fadeOut: safe(fadeOut), duck: safe(duck),
    setListener: safe((x, y) => { listener.x = x; listener.y = y; updateEmitters(); }), setEmitters: safe(setEmitters),
    settings: () => Object.assign({}, set), defaults: () => Object.assign({}, DEF),
    get unlocked() { return unlocked; },
    state: () => ({ supported: !!AC, unlocked, ctx: ctx ? ctx.state : 'none', hidden, bgm: mapBgm, playing: cur ? cur.id : null, track: cur ? cur.n : 0, parked: Object.keys(parked), overrides: overrides.map(o => o.kind + ':' + o.id),
      ambient: amb ? amb.id : null, voices: voices.filter(v => v.end >= now()).length, played: Object.assign({}, stat.played), dropped: Object.assign({}, stat.dropped), missing: Object.keys(stat.missing), log: stat.log.slice(-30), tracks: stat.tracks, loops: loopsOn.size }),
    LIMIT,
  };
})();
