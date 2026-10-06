'use strict';
// Shared builder for cave-style dungeons: rock everywhere, rooms carved as noisy blobs, joined by tunnels,
// a safe entrance room with the exit portal, and a sealed boss chamber at the far end.
module.exports = (G, o) => {
  const { mkMap, rng, set, rect, line, blob, portal } = G;
  const m = mkMap(o.id, o.name, o.w, o.h, 6), r = rng(o.seed);
  for (const [x, y, rx, ry] of o.rooms) blob(m, r, x, y, rx, ry, 0, 0.18);
  for (const path of o.tunnels) line(m, path, 0, o.tw || 3);
  for (let i = 0; i < (o.pillars || 30); i++) { const x = 2 + Math.floor(r() * (o.w - 4)), y = 2 + Math.floor(r() * (o.h - 4)); if (m.t[y * m.w + x] === 0 && r() < 0.5) set(m, x, y, 6); }
  const [ex, ey] = o.entry; rect(m, ex - 2, ey - 1, ex + 2, ey + 3, 0);
  for (let x = 0; x < m.w; x++) { set(m, x, 0, 6); set(m, x, m.h - 1, 6); } for (let y = 0; y < m.h; y++) { set(m, 0, y, 6); set(m, m.w - 1, y, 6); }
  const [px, py, to, tx, ty] = o.exit; portal(m, px, py, to, tx, ty);
  rect(m, ex - 1, ey + 1, ex + 1, ey + 2, 0);
  m.spawn = { x: ex, y: ey + 2 };
  m.safe = [[ex - 2, ey - 1, ex + 2, ey + 3]];
  m.spawns = o.spawns; m.bosses = o.bosses || []; m.deco = o.deco || []; m.nodes = o.nodes || [];
  return m;
};
