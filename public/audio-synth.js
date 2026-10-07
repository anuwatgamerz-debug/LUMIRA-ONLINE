// ============================================================ ELYNDRA ONLINE — placeholder sound synth
// Renders the registry's synth recipes into raw samples with plain JS math (no AudioContext needed), so
// a placeholder plays instantly on first use and the same code can be checked in Node tests.
(function (root) {
  'use strict';
  const SR = 22050;
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
  // biquad coefficients (RBJ cookbook)
  function biquad(type, f, q) {
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  // one part = one oscillator or filtered noise with an attack + exponential decay envelope
  function renderPart(out, p) {
    const s0 = Math.floor(p.at * SR), n = Math.floor(p.d * SR), [f0, f1] = p.f, a = Math.max(1, Math.floor((p.a || 0.004) * SR));
    let ph = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, co = null;
    for (let i = 0; i < n && s0 + i < out.length; i++) {
      const t = i / n, f = f0 * Math.pow(f1 / f0, t) + (p.vib ? Math.sin(i / SR * 2 * Math.PI * p.vib[0]) * p.vib[1] : 0);
      const env = (i < a ? i / a : Math.exp(-5 * (i - a) / Math.max(1, n - a))) * p.v;
      let v;
      if (p.w === 'noise') {
        if (!co || (i & 63) === 0) co = biquad(p.fl || 'lp', f, p.q || 1);
        const x = rnd(); v = co[0] * x + co[1] * x1 + co[2] * x2 - co[3] * y1 - co[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = v;
      } else {
        ph += f / SR; ph -= Math.floor(ph);
        v = p.w === 'sine' ? Math.sin(ph * 2 * Math.PI) : p.w === 'square' ? (ph < 0.5 ? 0.7 : -0.7) : p.w === 'sawtooth' ? (ph * 2 - 1) * 0.7 : 1 - 4 * Math.abs(ph - 0.5);
      }
      out[s0 + i] += v * env;
    }
  }
  // recipe (array of parts) -> Float32Array at SR, soft-clipped, with a 5ms fade-out tail
  function render(parts) {
    let len = 0; for (const p of parts) len = Math.max(len, p.at + p.d);
    const out = new Float32Array(Math.ceil((len + 0.02) * SR));
    for (const p of parts) renderPart(out, p);
    for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.2) * 0.85;
    const fo = Math.min(out.length, Math.floor(0.005 * SR)); for (let i = 0; i < fo; i++) out[out.length - 1 - i] *= i / fo;
    return out;
  }
  const API = { SR, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AUDIO_SYNTH = API;
})(typeof window !== 'undefined' ? window : this);
