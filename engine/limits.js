'use strict';
// fixed-window rate limits: hit(key, max, windowMs) -> true when allowed. Used for login, sign-up, character
// creation, chat, trade, friend requests, mail and (later) market. Old windows are swept every minute.
module.exports = function limiter() {
  const m = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of m) if (v.until <= now) m.delete(k); }, 60000).unref();
  return {
    hit(key, max, win) { const now = Date.now(); let v = m.get(key); if (!v || v.until <= now) { v = { n: 0, until: now + win }; m.set(key, v); } v.n++; return v.n <= max; },
    left(key) { const v = m.get(key); return v ? Math.max(0, v.until - Date.now()) : 0; },
    reset(key) { m.delete(key); },
  };
};
