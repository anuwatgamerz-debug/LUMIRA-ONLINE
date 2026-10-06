'use strict';
// Tile map building helpers shared by every map in content/maps. Tiles:
// 0 sand/floor 1 grass 2 water 3 wall 4 path 5 tree 6 rock 7 cactus 8 portal 9 roof 10 plaza 11 flower 12 bridge
const SOLID = new Set([2, 3, 5, 6, 7, 9]);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function mkMap(id, name, w, h, fill) { const t = new Array(w * h).fill(fill); return { id, name, w, h, t, portals: [], npcs: [], spawns: [], bossSpawn: null, bosses: [], props: [], deco: [], nodes: [], safe: [] }; }
function set(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y * m.w + x] = v; }
function get(m, x, y) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 3; return m.t[y * m.w + x]; }
function rect(m, x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(m, x, y, v); }
function border(m, v) { for (let x = 0; x < m.w; x++) { set(m, x, 0, v); set(m, x, m.h - 1, v); } for (let y = 0; y < m.h; y++) { set(m, 0, y, v); set(m, m.w - 1, y, v); } }
// building sprite b_<k>_<w>x<h>: roof tiles + a wall row along the bottom
function building(m, x, y, w, h, k) { rect(m, x, y, x + w - 1, y + h - 2, 9); rect(m, x, y + h - 1, x + w - 1, y + h - 1, 3); m.props.push({ k: k || 'home_A', x, y, w, h }); }
// scatter tile v on cells that currently hold one of `on`, inside [x0,y0,x1,y1]
function scatter(m, r, n, v, z, on = null) { const [x0, y0, x1, y1] = z || [1, 1, m.w - 2, m.h - 2]; for (let i = 0; i < n; i++) { const x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1)); if (!on || on.includes(get(m, x, y))) set(m, x, y, v); } }
// thick line (roads, rivers) between points
function line(m, pts, v, wdt = 1) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
    for (let k = 0; k <= n; k++) { const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n); rect(m, x - (wdt >> 1), y - (wdt >> 1), x + ((wdt - 1) >> 1), y + ((wdt - 1) >> 1), v); }
  }
}
// noisy blob (lakes, groves, clearings)
function blob(m, r, cx, cy, rx, ry, v, rough = 0.25) { for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d < 1 - rough + r() * rough * 2) set(m, x, y, v); } }
// clear a walkable area (keeps it open for spawns, camps, NPC spots)
const clear = (m, x0, y0, x1, y1, v = 1) => rect(m, x0, y0, x1, y1, v);
// portal tile on the edge + a walkable tile in front of it
function portal(m, x, y, to, tx, ty, req, label) { set(m, x, y, 8); m.portals.push(Object.assign({ x, y, to, tx, ty }, req ? { req } : {}, label ? { label } : {})); }
module.exports = { SOLID, rng, mkMap, set, get, rect, border, building, scatter, line, blob, clear, portal };
